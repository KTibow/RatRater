const html = (literals, ...substitutions) => {
  let result = "";
  for (let i = 0; i < substitutions.length; i++) {
    result += literals[i];
    result += substitutions[i];
  }
  result += literals[literals.length - 1];
  const elem = document.createRange().createContextualFragment(result.trim());
  return elem.children.length > 1 ? elem : elem.firstChild;
};
