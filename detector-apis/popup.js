window.addEventListener("load", async (event) => {
    console.log(event)

    // set value list apis request
    await chrome.storage.local.get(null, async function (items) {
        let trContent = ""
        for (let element of Object.keys(items)) {
            for (const element2 of Object.keys(items)) {
                if (items[element] === element2) {
                    let curlCommand = items[element] + "-curl"
                    let statusAndRequestID = items[element2].split("|")
                    trContent += `<tr><td><button type="button" class="btn btn-info" id=${curlCommand}>Copy</button></td><td>${items[element]}</td><td>${statusAndRequestID[0]}</td><td>${statusAndRequestID[1]}</td></tr>`

                    break
                }
            }
        }
        document.querySelector("#table-result>tbody").innerHTML = `<tbody>${trContent}</tbody>`

        // handle list button
        let listTR = document.querySelector("#table-result>tbody").getElementsByTagName("tr")
        for (const trTag of listTR) {
            let buttonID = trTag.getElementsByTagName("td")[0].getElementsByTagName("button")[0].id

            document.getElementById(buttonID).addEventListener('click', function () {
                copyCurl(buttonID, items)
            })
        }
    })
})

function copyCurl(curlCommand, items) {
    for (let element of Object.keys(items)) {
        for (const element2 of Object.keys(items)) {
            if (items[element] === element2 && element2 + "-curl" === curlCommand) {
                navigator.clipboard.writeText(items[curlCommand]).then(r => {
                    console.log(r)
                    alert("Copied !")
                })
            }
        }
    }
}
