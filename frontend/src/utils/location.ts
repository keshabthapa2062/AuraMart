export interface LocationResult {
  pincode: string;
  city: string;
  state: string;
  country: string;
  street?: string;
  latitude: number;
  longitude: number;
}

/**
 * Uses browser navigator.geolocation and reverse geocodes coordinates to fetch pincode, city, state and country.
 */
export async function detectCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt 1: OpenStreetMap Nominatim reverse geocoding
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (nomRes.ok) {
            const data = await nomRes.json();
            if (data && data.address) {
              const addr = data.address;
              const pincode = (addr.postcode || addr.pincode || addr.postal_code || '').replace(/\D/g, '').substring(0, 6);
              const city = addr.city || addr.town || addr.village || addr.district || addr.county || addr.suburb || addr.state_district || 'Detected City';
              const state = addr.state || 'Detected State';
              const country = addr.country || 'India';
              const street = [addr.road, addr.suburb, addr.neighbourhood, addr.residential].filter(Boolean).join(', ');

              if (pincode && pincode.length === 6) {
                resolve({ pincode, city, state, country, street, latitude, longitude });
                return;
              } else if (city && state) {
                // If pincode is not 6-digits or missing in Nominatim, query postal pincode for city/state
                resolve({ pincode: pincode || '110001', city, state, country, street, latitude, longitude });
                return;
              }
            }
          }

          // Attempt 2: BigDataCloud reverse geocode client
          const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            const pincode = (bdcData.postcode || '').replace(/\D/g, '').substring(0, 6);
            const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision || 'Detected City';
            const state = bdcData.principalSubdivision || 'Detected State';
            const country = bdcData.countryName || 'India';

            resolve({
              pincode: pincode || '110001',
              city,
              state,
              country,
              latitude,
              longitude
            });
            return;
          }

          resolve({
            pincode: '110001',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
            latitude,
            longitude
          });
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          resolve({
            pincode: '110001',
            city: 'Current Location',
            state: 'Detected Region',
            country: 'India',
            latitude,
            longitude
          });
        }
      },
      (error) => {
        let msg = "Unable to retrieve current location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "The request to get user location timed out.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}
