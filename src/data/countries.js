// ISO 3166-1 alpha-2 codes. Names come from the browser's locale data.
const codes = "ADAEAFAGAIALAMAOAQARASATAUAWAXAZBABBBDBEBFBGBHBIBJBLBMBNBOBQBRBSBTBVBWBYBZCACCCDCFCGCHCICKCLCMCNCOCRCUCVCWCXCYCZDEDJDKDMDODZECEEEGEHERESETFIFJFKFMFOFRGAGBGDGEGFGGGHGIGLGMGNGPGQGRGSGTGUGWGYHKHMHNHRHTHUIDIEILIMINIOIQIRISITJEJMJOJPKEKGKHKIKMKNKPKRKWKYKZLALBLCLILKLRLSLTLULVLYMAMCMDMEMFMGMHMKMLMMMNMOMPMQMRMSMTMUMVMWMXMYMZNANCNENFNGNINLNONPNRNUNZOMPAPEPFPGPHPKPLPMPNPRPSPTPWPYQARERORSRURWSASBSCSDSESGSHSISJSKSLSMSNSOSRSSSTSVSXSYSZTCTDTFTGTHTJTKTLTMTNTOTRTTTVTWTZUAUGUMUSUYUZVAVCVEVGVIVNVUWFWSYEYTZAZMZW";
const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export const countries = Array.from({ length: codes.length / 2 }, (_, index) => {
  const code = codes.slice(index * 2, index * 2 + 2);
  return { code, name: displayNames.of(code) };
}).sort((a, b) => a.name.localeCompare(b.name));

export function findCountry(value) {
  const normalized = value.trim().toLocaleLowerCase();
  return countries.find((country) => country.name.toLocaleLowerCase() === normalized || country.code.toLocaleLowerCase() === normalized);
}
