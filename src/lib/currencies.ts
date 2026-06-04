export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: Currency[] = [
  // Major / G10
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },

  // South Asia
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "Rs", name: "Nepalese Rupee" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani" },
  { code: "MVR", symbol: "Rf", name: "Maldivian Rufiyaa" },

  // Middle East
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "QAR", symbol: "QAR", name: "Qatari Riyal" },
  { code: "KWD", symbol: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", symbol: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial" },
  { code: "JOD", symbol: "JOD", name: "Jordanian Dinar" },
  { code: "IQD", symbol: "IQD", name: "Iraqi Dinar" },
  { code: "IRR", symbol: "IRR", name: "Iranian Rial" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "LBP", symbol: "LBP", name: "Lebanese Pound" },
  { code: "SYP", symbol: "SYP", name: "Syrian Pound" },
  { code: "YER", symbol: "YER", name: "Yemeni Rial" },

  // East & Southeast Asia
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel" },
  { code: "LAK", symbol: "₭", name: "Lao Kip" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tugrik" },
  { code: "BND", symbol: "B$", name: "Brunei Dollar" },

  // Europe (non-EUR)
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna" },
  { code: "RSD", symbol: "din", name: "Serbian Dinar" },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram" },
  { code: "AZN", symbol: "₼", name: "Azerbaijani Manat" },
  { code: "MDL", symbol: "L", name: "Moldovan Leu" },
  { code: "BAM", symbol: "KM", name: "Bosnia Mark" },
  { code: "MKD", symbol: "ден", name: "Macedonian Denar" },
  { code: "ALL", symbol: "L", name: "Albanian Lek" },

  // Americas
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
  { code: "COP", symbol: "CO$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "UYU", symbol: "$U", name: "Uruguayan Peso" },
  { code: "BOB", symbol: "Bs", name: "Bolivian Boliviano" },
  { code: "PYG", symbol: "₲", name: "Paraguayan Guarani" },
  { code: "VES", symbol: "Bs.S", name: "Venezuelan Bolivar" },
  { code: "DOP", symbol: "RD$", name: "Dominican Peso" },
  { code: "CRC", symbol: "₡", name: "Costa Rican Colon" },
  { code: "GTQ", symbol: "Q", name: "Guatemalan Quetzal" },
  { code: "HNL", symbol: "L", name: "Honduran Lempira" },
  { code: "NIO", symbol: "C$", name: "Nicaraguan Cordoba" },
  { code: "PAB", symbol: "B/.", name: "Panamanian Balboa" },
  { code: "JMD", symbol: "J$", name: "Jamaican Dollar" },
  { code: "TTD", symbol: "TT$", name: "Trinidad Dollar" },
  { code: "HTG", symbol: "G", name: "Haitian Gourde" },
  { code: "BBD", symbol: "Bds$", name: "Barbadian Dollar" },
  { code: "BSD", symbol: "B$", name: "Bahamian Dollar" },
  { code: "BZD", symbol: "BZ$", name: "Belize Dollar" },
  { code: "GYD", symbol: "GY$", name: "Guyanese Dollar" },
  { code: "SRD", symbol: "SR$", name: "Surinamese Dollar" },

  // Africa
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham" },
  { code: "TND", symbol: "DT", name: "Tunisian Dinar" },
  { code: "DZD", symbol: "DA", name: "Algerian Dinar" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha" },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "MUR", symbol: "Rs", name: "Mauritian Rupee" },
  { code: "SCR", symbol: "SRe", name: "Seychellois Rupee" },
  { code: "SDG", symbol: "SDG", name: "Sudanese Pound" },
  { code: "LYD", symbol: "LD", name: "Libyan Dinar" },
  { code: "CDF", symbol: "FC", name: "Congolese Franc" },
  { code: "SOS", symbol: "Sh", name: "Somali Shilling" },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi" },
  { code: "SLL", symbol: "Le", name: "Sierra Leonean Leone" },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary" },

  // Central Asia
  { code: "KZT", symbol: "₸", name: "Kazakh Tenge" },
  { code: "UZS", symbol: "soʻm", name: "Uzbek Som" },
  { code: "KGS", symbol: "som", name: "Kyrgyz Som" },
  { code: "TJS", symbol: "SM", name: "Tajik Somoni" },
  { code: "TMT", symbol: "T", name: "Turkmen Manat" },

  // Oceania
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar" },
  { code: "PGK", symbol: "K", name: "Papua New Guinean Kina" },
  { code: "WST", symbol: "WS$", name: "Samoan Tala" },
  { code: "TOP", symbol: "T$", name: "Tongan Pa'anga" },
  { code: "VUV", symbol: "VT", name: "Vanuatu Vatu" },
  { code: "SBD", symbol: "SI$", name: "Solomon Islands Dollar" },

  // Caribbean & misc
  { code: "XCD", symbol: "EC$", name: "East Caribbean Dollar" },
  { code: "AWG", symbol: "Afl.", name: "Aruban Florin" },
  { code: "ANG", symbol: "NAƒ", name: "Netherlands Antillean Guilder" },
  { code: "CUP", symbol: "CU$", name: "Cuban Peso" },
  { code: "BMD", symbol: "BD$", name: "Bermudian Dollar" },
  { code: "KYD", symbol: "CI$", name: "Cayman Islands Dollar" },

  // Crypto-pegged / special
  { code: "BTC", symbol: "₿", name: "Bitcoin" },
];

/** Look up a currency by ISO code; falls back to the code itself as the symbol. */
export function getCurrencySymbol(code: string): string {
  return currencies.find(c => c.code === code)?.symbol ?? code;
}

/** Format a number with the correct currency symbol. */
export function formatMoney(amount: number, currencyCode: string): string {
  const sym = getCurrencySymbol(currencyCode);
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
