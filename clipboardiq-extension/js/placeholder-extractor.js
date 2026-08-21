function ciqTemplateTokens(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const tokens = [];
  words.forEach((word) => {
    let core = word;
    let trailing = "";

    const punctMatch = core.match(/[,;:!?)\]]+$/);
    if (punctMatch) {
      trailing = punctMatch[0];
      core = core.slice(0, -punctMatch[0].length);
    }

    if (core.endsWith(".")) {
      const beforeDot = core.slice(0, -1);
      const hasInternalDot = beforeDot.includes(".");
      const isEmailLike = core.includes("@");
      const isDecimalLike = /\d\.\d/.test(word);
      if (!hasInternalDot && !isEmailLike && !isDecimalLike) {
        core = beforeDot;
        trailing = "." + trailing;
      }
    }

    if (core) tokens.push(core);
    trailing.split("").forEach((ch) => tokens.push(ch));
  });
  return tokens;
}

function ciqJoinTokens(tokens) {
  let result = "";
  tokens.forEach((token, idx) => {
    if (idx === 0) {
      result = token;
      return;
    }
    const noSpaceBefore = /^[,.;:!?)\]]+$/.test(token);
    result += (noSpaceBefore ? "" : " ") + token;
  });
  return result;
}

function ciqAlignTokens(baseTokens, otherTokens) {
  const n = baseTokens.length;
  const m = otherTokens.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = baseTokens[i] === otherTokens[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const alignment = new Array(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (baseTokens[i] === otherTokens[j]) {
      alignment[i] = j;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return alignment;
}

function ciqPickBackboneIndex(tokenLists) {
  const withLengths = tokenLists.map((tokens, idx) => ({ idx, len: tokens.length }));
  withLengths.sort((a, b) => a.len - b.len);
  return withLengths[Math.floor(withLengths.length / 2)].idx;
}

function ciqSpanSample(tokens, alignment, start, end) {
  const leftAnchor = start - 1;
  const rightAnchor = end + 1;
  const leftPos = leftAnchor >= 0 && alignment[leftAnchor] !== -1 ? alignment[leftAnchor] + 1 : 0;
  const rightPos = rightAnchor < alignment.length && alignment[rightAnchor] !== -1
    ? alignment[rightAnchor]
    : tokens.length;
  if (rightPos <= leftPos) return "";
  return ciqJoinTokens(tokens.slice(leftPos, rightPos));
}

function ciqClassifyPlaceholder(samples) {
  const values = samples.map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return "value";

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const orderRe = /^#?\d{4,}$/;
  const dateRe = /^(\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
  const numberRe = /^\d+([.,]\d+)?$/;
  const nameRe = /^[A-Z][a-zA-Z'-]*(\s[A-Z][a-zA-Z'-]*){0,2}$/;

  if (values.every((v) => emailRe.test(v))) return "email";
  if (values.every((v) => orderRe.test(v))) return "order_id";
  if (values.every((v) => dateRe.test(v))) return "date";
  if (values.every((v) => numberRe.test(v))) return "number";
  if (values.every((v) => nameRe.test(v))) return "customer_name";
  return "value";
}

function ciqBuildTemplate(memberTexts) {
  const tokenLists = memberTexts.map((text) => ciqTemplateTokens(text));
  const backboneIndex = ciqPickBackboneIndex(tokenLists);
  const backboneTokens = tokenLists[backboneIndex];

  const alignments = tokenLists.map((tokens, idx) =>
    idx === backboneIndex ? backboneTokens.map((_, i) => i) : ciqAlignTokens(backboneTokens, tokens)
  );

  const fixed = backboneTokens.map((_, pos) => alignments.every((alignment) => alignment[pos] !== -1));

  const spans = [];
  let spanStart = null;
  for (let idx = 0; idx <= backboneTokens.length; idx++) {
    const isVariable = idx < backboneTokens.length && !fixed[idx];
    if (isVariable && spanStart === null) spanStart = idx;
    if (!isVariable && spanStart !== null) {
      spans.push([spanStart, idx - 1]);
      spanStart = null;
    }
  }

  const placeholders = spans.map(([start, end]) => {
    const sampleValues = tokenLists.map((tokens, idx) => ciqSpanSample(tokens, alignments[idx], start, end));
    const type = ciqClassifyPlaceholder(sampleValues);
    return { start, end, type, sampleValues: sampleValues.filter(Boolean) };
  });

  const typeCounts = {};
  placeholders.forEach((placeholder) => {
    typeCounts[placeholder.type] = (typeCounts[placeholder.type] || 0) + 1;
    const suffix = typeCounts[placeholder.type] > 1 ? "_" + typeCounts[placeholder.type] : "";
    placeholder.token = `{{${placeholder.type}${suffix}}}`;
  });

  const bodyTokens = backboneTokens.slice();
  for (let k = placeholders.length - 1; k >= 0; k--) {
    const { start, end, token } = placeholders[k];
    bodyTokens.splice(start, end - start + 1, token);
  }

  return {
    body: ciqJoinTokens(bodyTokens),
    placeholders: placeholders.map((p) => ({
      token: p.token,
      type: p.type,
      sampleValues: p.sampleValues.slice(0, 4)
    }))
  };
}
