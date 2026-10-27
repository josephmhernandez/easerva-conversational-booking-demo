import {
  extractPrimaryAddressFromBusinessLocationStep,
  toCitySlug,
  toStateAbbr,
  toStateName,
} from "@/app/utils/location";

describe("location utils", () => {
  it("creates city slug", () => {
    expect(toCitySlug("New York City")).toBe("new-york-city");
    expect(toCitySlug(" Austin ")).toBe("austin");
  });

  it("maps state names and abbreviations", () => {
    expect(toStateAbbr("Texas")).toBe("TX");
    expect(toStateAbbr("tx")).toBe("TX");
    expect(toStateName("TX")).toBe("Texas");
    expect(toStateName("Texas")).toBe("Texas");
  });

  it("extracts primary physical address", () => {
    const address = extractPrimaryAddressFromBusinessLocationStep({
      "serviceTypes.physical": {
        addresses: [{ line1: "123 Main", city: "Austin", state: "TX", zipCode: "78701" }],
      },
    });

    expect(address).toEqual({ line1: "123 Main", city: "Austin", state: "TX", zipCode: "78701" });
  });
});
