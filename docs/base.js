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
String.prototype.hashCode = function () {
  var hash = 0,
    i,
    chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
