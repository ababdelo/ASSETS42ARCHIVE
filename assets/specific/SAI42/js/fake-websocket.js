/**
 * Fake WebSocket for simulating plant sensor data
 * Can be used for testing dashboards without a real backend
 */
class FakeWebSocket {
   constructor(url) {
      console.log('Fake WebSocket connected to', url);
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;

      setTimeout(() => this.onopen && this.onopen(), 200);

      // Internal state
      let soilMoisture = 50; // start medium
      let temperature = 25; // °C
      let humidity = 50; // %
      let isDay = true; // day/night
      let countdown = 0;

      function getPlantStatus(moisture) {
         if (moisture > 80) return "Overwatered";
         if (moisture < 20) return "Dry";
         if (moisture < 40) return "Thirsty";
         return "Healthy";
      }

      function fluctuate(value, minChange, maxChange, min, max) {
         value += minChange + Math.random() * (maxChange - minChange);
         return Math.min(Math.max(value, min), max);
      }

      setInterval(() => {
         // Day/night cycle
         if (Math.random() < 0.05) isDay = !isDay;

         // Weather simplified
         const weather = Math.random() < 0.25 ? "Rainy" : "Clear";

         // Temperature & humidity
         if (weather === "Rainy") {
            temperature = fluctuate(temperature, -1, 1, 15, 25);
            humidity = fluctuate(humidity, 5, 10, 60, 100);
         } else if (isDay) {
            temperature = fluctuate(temperature, -1, 2, 20, 35);
            humidity = fluctuate(humidity, -3, 2, 20, 50);
         } else {
            temperature = fluctuate(temperature, -1, 1, 18, 28);
            humidity = fluctuate(humidity, 0, 2, 25, 60);
         }

         // Soil moisture
         if (weather === "Rainy") soilMoisture = fluctuate(soilMoisture, 2, 5, 0, 100);
         else if (isDay) soilMoisture = fluctuate(soilMoisture, -1.5, -0.5, 0, 100);
         else soilMoisture = fluctuate(soilMoisture, -0.5, 0, 0, 100);

         const plantStatus = getPlantStatus(soilMoisture);

         // Pump logic
         let pumpStatus = "OFF";
         if (!isDay || temperature <= 30) {
            if (plantStatus !== "Overwatered" && weather === "Clear" && soilMoisture < 40) {
               if (Math.random() < 0.4) {
                  pumpStatus = "ON";
                  countdown = 5 + Math.floor(Math.random() * 5);
                  soilMoisture = Math.min(soilMoisture + countdown * 1.5, 100);
               } else countdown = 0;
            } else countdown = 0;
         } else countdown = 0;

         const lighting = isDay ? "Day" : "Night";

         const data = {
            temperature: temperature.toFixed(1),
            humidity: humidity.toFixed(1),
            moisture: soilMoisture.toFixed(1),
            lighting: lighting,
            weather: weather,
            pumpStatus: pumpStatus,
            plantStatus: plantStatus,
            countdown: countdown
         };

         this.onmessage && this.onmessage({
            data: JSON.stringify(data)
         });
      }, 2000);
   }

   send(msg) {
      console.log("Fake WS send:", msg);
   }

   close() {
      console.log("Fake WS closed");
   }
}

// Override global WebSocket with FakeWebSocket
window.WebSocket = FakeWebSocket;
