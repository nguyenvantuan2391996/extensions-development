function updateCheckmark(selectedDiv, src) {
    document.querySelectorAll(".checkmark").forEach(c => c.remove());
    const check = document.createElement("div");
    check.className = "checkmark";
    check.innerHTML = "✔";
    selectedDiv.appendChild(check);
    localStorage.setItem(GIF_SELECTED, JSON.stringify([src]))
}

function deleteGif(event, src) {
    event.stopPropagation();
    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");

    list_gifs.forEach(img => {
        if (img.src === src) {
            const gifItem = img.closest(".gif-item");
            if (gifItem) gifItem.remove();
        }
    });

    let current_gifs = JSON.parse(localStorage.getItem(LIST_GIFS))
    localStorage.setItem(LIST_GIFS, JSON.stringify(current_gifs.filter(item => item !== src)))
}

// function addGifByUrl() {
//     const input = document.getElementById("gifUrl");
//     const url = input.value.trim();
//     if (url) {
//         gifs.unshift(url);
//         input.value = "";
//         gifsLoaded++; // count as loaded
//         addGifToDOM(url, true);
//     }
// }
//
// function handleFileUpload() {
//     const fileInput = document.getElementById("gifFile");
//     const file = fileInput.files[0];
//     if (file && file.type === "image/gif") {
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             gifs.unshift(e.target.result);
//             gifsLoaded++;
//             addGifToDOM(e.target.result, true);
//         };
//         reader.readAsDataURL(file);
//     }
// }
