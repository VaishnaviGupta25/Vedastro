document.getElementById("apiType").addEventListener("change", function () {
  const type = this.value;
  document.getElementById("partnerSection").style.display =
    type === "MatchReport" ? "block" : "none";
});

function formatDateTime(datetimeStr) {
  const dt = new Date(datetimeStr);
  const date = dt.toLocaleDateString("en-GB").split("/").join("/"); // dd/mm/yyyy
  const time = dt.toTimeString().split(" ")[0].substring(0, 5); // HH:mm
  return { date, time };
}

async function callAPI() {
  const type = document.getElementById("apiType").value;
  const datetime = document.getElementById("userDatetime").value;
  const location = encodeURIComponent(document.getElementById("userLocation").value.trim());
  const timezone = document.getElementById("userTimezone").value.trim();
  const output = document.getElementById("output");

  const timezonePattern = /^[+-]?\d+(\.\d+)?$/;
  if (!timezonePattern.test(timezone)) {
    output.innerHTML = "❌ Please enter valid timezone (e.g., +5.5)";
    return;
  }

  const { date, time } = formatDateTime(datetime);
  let url = "";

  switch (type) {
    case "HoroscopePredictions":
      url = `https://api.vedastro.org/api/Calculate/HoroscopePredictions/Location/${location}/Time/${time}/${date}/${timezone}/Ayanamsa/RAMAN`;
      break;

    case "SouthIndianChart":
      url = `https://api.vedastro.org/api/Calculate/SouthIndianChart/Location/${location}/Time/${time}/${date}/${timezone}/ChartType/BhavaChalit/Ayanamsa/RAMAN`;
      break;

    case "AllPlanetData":
      url = `https://api.vedastro.org/api/Calculate/AllPlanetData/PlanetName/All/Location/${location}/Time/${time}/${date}/${timezone}/Ayanamsa/RAMAN`;
      break;

    case "AllHouseData":
      url = `https://api.vedastro.org/api/Calculate/AllHouseData/HouseName/All/Location/${location}/Time/${time}/${date}/${timezone}/Ayanamsa/RAMAN`;
      break;

    case "MatchReport": {
      const partnerDatetime = document.getElementById("partnerDatetime").value;
      const partnerLocation = encodeURIComponent(document.getElementById("partnerLocation").value.trim());

      if (!partnerDatetime || !partnerLocation) {
        output.innerHTML = "❌ Please enter partner's birth info.";
        return;
      }

      const { date: pd, time: pt } = formatDateTime(partnerDatetime);

      url = `https://api.vedastro.org/api/Calculate/MatchReport/Person/${location}/${time}/${date}/${timezone}/Partner/${partnerLocation}/${pt}/${pd}/${timezone}/Ayanamsa/RAMAN`;
      break;
    }
  }

  try {
    const res = await fetch(url);

    if (!res.ok) throw new Error("API returned an error response");

    if (type === "SouthIndianChart") {
      const text = await res.text();
      if (text.includes("<svg")) {
        output.innerHTML = text;
      } else {
        throw new Error("❌ Not a valid SVG chart.");
      }
      return;
    }

    const data = await res.json();

    if (type === "HoroscopePredictions" && data?.Payload?.length) {
      const descriptions = data.Payload.map(item => item.Description).filter(Boolean).join("<br><br>");
      output.innerHTML = `<h3>🧘 Horoscope Predictions:</h3>${descriptions}`;
      return;
    }

    if (type === "AllPlanetData" && data?.Payload?.AllPlanetData) {
      const planetList = data.Payload.AllPlanetData;
      let html = `<h3>🪐 Planetary Data:</h3>`;
      planetList.forEach(item => {
        const planetName = Object.keys(item)[0];
        const planetData = item[planetName];
        html += `
          <div style="margin-bottom: 1em;">
            <strong>${planetName}</strong><br>
            • Rasi: ${planetData?.PlanetRasiD1Sign?.Name || "Unknown"}<br>
            • Strength: ${planetData?.IsPlanetStrongInShadbala === "True" ? "✅ Strong" : "❌ Weak"}<br>
            • Aspects: ${planetData?.SignsPlanetIsAspecting || "None"}<br>
            • Constellation: ${planetData?.PlanetConstellation || "Unknown"}<br>
            • Avastha: ${planetData?.PlanetAvasta || "Unknown"}<br>
            • Dasa Effect: ${planetData?.PlanetDasaEffectsBasedOnIshtaKashta || "Not specified"}
          </div>
        `;
      });
      output.innerHTML = html;
      return;
    }

    if (type === "AllHouseData" && data?.Payload?.AllHouseData) {
      const houseList = data.Payload.AllHouseData;
      let html = `<h3>🏠 House Data:</h3>`;
      houseList.forEach(houseObj => {
        const houseKey = Object.keys(houseObj)[0];
        const signs = houseObj[houseKey];
        html += `<div><strong>${houseKey}</strong><br>`;
        for (const [signType, signData] of Object.entries(signs)) {
          html += `• ${signType}: ${signData?.Name || "Unknown"} (${signData?.DegreesIn?.DegreeMinuteSecond || "0°"})<br>`;
        }
        html += `</div><br>`;
      });
      output.innerHTML = html;
      return;
    }

    if (type === "MatchReport" && data?.Payload?.MatchReport) {
  const report = data.Payload.MatchReport;
  const score = report.KutaScore || "N/A";
  const notes = report.Notes || "No notes available.";

  output.innerHTML = `
    <h3>💞 Match Report:</h3>
    <p><strong>Kuta Score:</strong> ${score}</p>
    <p><strong>Analysis:</strong> ${notes}</p>
  `;
  return;
}


    if (data?.Prediction) {
      output.innerHTML = `<h3>🔮 Prediction:</h3><p>${data.Prediction}</p>`;
      return;
    }

    output.innerHTML = `ℹ️ No predictions found.<br><pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (err) {
    output.innerHTML = `❌ Error fetching data from API:<br>${err.message}`;
    console.error("Full error:", err);
  }
}