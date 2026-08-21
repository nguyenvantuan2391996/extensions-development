function ciqTokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function ciqShingles(tokens, n) {
  const set = new Set();
  if (tokens.length < n) {
    tokens.forEach((token) => set.add(token));
    return set;
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    set.add(tokens.slice(i, i + n).join("_"));
  }
  return set;
}

function ciqJaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  const smaller = setA.size < setB.size ? setA : setB;
  const larger = smaller === setA ? setB : setA;
  let intersection = 0;
  smaller.forEach((item) => {
    if (larger.has(item)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function ciqSimilarity(textA, textB) {
  const tokensA = ciqTokenize(textA);
  const tokensB = ciqTokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const bigramScore = ciqJaccard(ciqShingles(tokensA, 2), ciqShingles(tokensB, 2));
  const unigramScore = ciqJaccard(new Set(tokensA), new Set(tokensB));
  return bigramScore * 0.7 + unigramScore * 0.3;
}
