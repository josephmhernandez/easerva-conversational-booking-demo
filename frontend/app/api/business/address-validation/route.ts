import { NextResponse } from "next/server";
import { Address } from "../../../types/businessTypes";
import { createClient } from "../../../utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }
    const user = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { address } = await request.json();
    const googleAddress = convertToGoogleFormat(address);

    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(googleAddress),
      }
    );
    const data = await response.json();

    const returnData = {
      ...data.result.address.postalAddress,
    };
    return NextResponse.json(returnData);
  } catch (error) {
    console.error("Error validating address:", error);
    return NextResponse.json({ error: "Error validating address" }, { status: 500 });
  }
}
const convertToGoogleFormat = (address: Address) => {
  const addressLines = [];

  if (address.line1) {
    const fullStreet = address.line2 ? `${address.line1} ${address.line2}`.trim() : address.line1;
    addressLines.push(fullStreet);
  }

  const cityStateZip = [address.city, address.state, address.zipCode].filter(Boolean).join(" ");
  if (cityStateZip) {
    addressLines.push(cityStateZip);
  }

  return {
    address: {
      address_lines: addressLines, // Changed from addressLines to address_lines
      region_code: address.country, // Changed from regionCode to region_code
    },
  };
};
