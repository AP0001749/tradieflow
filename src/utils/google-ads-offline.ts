type UserIdentifier =
  | { hashedEmail: string }
  | { hashedPhoneNumber: string };

type ConversionDetails = {
  conversionAction: string;
  conversionDateTime: string;
  conversionValue: number;
  currencyCode: "AUD";
  orderId?: string;
  gclid?: string;
  userIdentifiers?: UserIdentifier[];
};

export async function pushOfflineConversion({
  gclid,
  conversionName,
  conversionValue,
  conversionTime,
  orderId,
  customerData,
}: {
  gclid?: string | null;
  conversionName: string;
  conversionValue: number;
  conversionTime: string; // "yyyy-mm-dd hh:mm:ss+|-hh:mm"
  orderId?: string;
  customerData?: {
    email?: string;
    phone?: string;    
  };
}) {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;

  // We only run this if fully configured and if we have a gclid or customerData
  if (!customerId || !devToken || !accessToken) {
    console.log("Offline Conversion skipped: Missing Google Ads API credentials.");
    return false;
  }

  if (!gclid && !customerData?.email && !customerData?.phone) {
    console.log("Offline Conversion skipped: Missing gclid or customer data.");
    return false;
  }

  const endpoint = `https://googleads.googleapis.com/v15/customers/${customerId}:uploadClickConversions`;

  const conversionDetails: ConversionDetails = {
    conversionAction: `customers/${customerId}/conversionActions/${conversionName}`,
    conversionDateTime: conversionTime,
    conversionValue: conversionValue,
    currencyCode: "AUD",
  };

  if (orderId) {
    conversionDetails.orderId = orderId;
  }

  if (gclid) {
    conversionDetails.gclid = gclid;
  }
  
  if (customerData?.email) {
    conversionDetails.userIdentifiers = conversionDetails.userIdentifiers || [];
    conversionDetails.userIdentifiers.push({ hashedEmail: customerData.email }); // Expecting hashed value or we hash it here
  }
  
  if (customerData?.phone) {
    conversionDetails.userIdentifiers = conversionDetails.userIdentifiers || [];
    conversionDetails.userIdentifiers.push({ hashedPhoneNumber: customerData.phone }); 
  }

  const payload = {
    conversions: [conversionDetails],
    partialFailure: true,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": devToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Failed to push Google Ads offline conversion:", result);
      return false;
    }

    console.log("Successfully pushed offline conversion to Google Ads");
    return true;
  } catch (error) {
    console.error("Error communicating with Google Ads API:", error);
    return false;
  }
}
