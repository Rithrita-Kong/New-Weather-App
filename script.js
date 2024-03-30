// import { apiKey } from "./config";
const inputElement = document.getElementById("input");
const searchButton = document.getElementById("searchButton");

// Function to handle search
const handleSearch = async () => {
  const input = inputElement.value;
  if (input) {
    try {
      refresh();
      let geoData = await fetchGeoCoding(input);
      let name = geoData.name;
      let lat = geoData.latitude;
      let long = geoData.longitude;

      let weatherData = await fetchWeatherData(lat, long);
      let temperature = weatherData.temperature_2m;
      let humidity = weatherData.relative_humidity_2m;
      let wind = weatherData.wind_speed_10m;
      let seaLevel = weatherData.pressure_msl;
      updateWeatherData(name, temperature, humidity, wind, seaLevel);

      let historyData = await fetchHistoricalWeatherData(lat, long);
      await chart(historyData);

      const resultPage = document.getElementById("result-page");
      resultPage.style.display = "block";
    } catch (error) {
      console.error("Error fetching geocoding data:", error);
    }
  }
};

const fetchGeoCoding = async (input) => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${input}&count=1&language=en&format=json`;
  try {
    let data = await fetch(url).then((res) => {
      return res.json();
    });
    if (data.results == undefined) {
      const errorPage = document.getElementById("error-page");
      errorPage.style.display = "block";
      console.error("City not exist:", data);
    } else {
      return data.results[0];
    }
  } catch (error) {
    console.error("Error fetching Geo data:", error);
  }
};

const fetchWeatherData = async (lat, long) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m`;
  try {
    let data = await fetch(url).then((res) => {
      return res.json();
    });
    return data.current;
  } catch (error) {
    console.error("Error fetching Weather data:", error);
  }
};

const fetchHistoricalWeatherData = async (lat, long) => {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${long}&start_date=2024-03-20&end_date=2024-03-27&daily=temperature_2m_mean,rain_sum,wind_speed_10m_max`;
  console.log(url);
  try {
    let data = await fetch(url).then((res) => {
      return res.json();
    });
    return data.daily;
  } catch (error) {
    console.error("Error fetching Weather data:", error);
  }
};

function refresh() {
  const errorPage = document.getElementById("error-page");
  const resultPage = document.getElementById("result-page");
  const selectElement = document.getElementById("selectButton");
  errorPage.style.display = "none";
  resultPage.style.display = "none";
  selectElement.selectedIndex = 0;
}

function updateWeatherData(name, temp, humidity, wind, sealevel) {
  const cityText = document.getElementById("city");
  const tempText = document.getElementById("temperature");
  const humidityText = document.getElementById("humidity");
  const windText = document.getElementById("wind");
  const seaText = document.getElementById("sea");

  cityText.innerText = `Result: ${name}`;
  tempText.innerText = `${temp} °C`;
  humidityText.innerText = `${humidity} %`;
  windText.innerText = `${wind} km/h`;
  seaText.innerHTML = `${sealevel} hPa`;
}

async function chart(data) {
  // Clear existing chart
  d3.select("#line-chart").selectAll("*").remove();

  // Creating new chart
  var margin = { top: 10, right: 30, bottom: 30, left: 60 };
  var width = 1400 - margin.left - margin.right;
  var height = 600 - margin.top - margin.bottom;
  var svg = d3
    .select("#line-chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var selectedGroup = "temperature_2m_mean"; // Default selection
  // A color scale: one color for each group
  var myColor = d3.scaleOrdinal().range(d3.schemeSet2);

  // Add X axis (assuming your data has years)
  let x = d3.scaleBand().domain(data.time).range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("class", "x-axis")
    .call(d3.axisBottom(x));

  // Add Y axis
  let y = d3
    .scaleLinear()
    .domain([d3.min(data[selectedGroup]), d3.max(data[selectedGroup])])
    .range([height, 0]);
  svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

  // Add labels
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Average Temperature (°C)");

  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + margin.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .text("Date");

  // Initialize line
  var line = svg
    .append("path")
    .datum(data[selectedGroup])
    .attr("fill", "none")
    .attr("stroke", function (d) {
      return myColor(selectedGroup);
    })
    .attr("stroke-width", 4)
    .attr(
      "d",
      d3
        .line()
        .x(function (d, i) {
          return x(data.time[i]) + x.bandwidth() / 2;
        })
        .y(function (d) {
          return y(d);
        })
    );

  // Function to update the chart
  function update(selectedGroup) {
    // Update Y axis domain
    y.domain([d3.min(data[selectedGroup]), d3.max(data[selectedGroup])]);
    svg.selectAll(".y-axis").transition().duration(750).call(d3.axisLeft(y));

    if (selectedGroup === "temperature_2m_mean") {
      textLabel = "Average Temperature (°C)";
    } else if (selectedGroup === "rain_sum") {
      textLabel = "Rain Sum (mm)";
    } else {
      textLabel = "Maximum Wind Speed (km/h)";
    }
    svg.selectAll(".y-label").text(textLabel).transition().duration(750);

    line
      .datum(data[selectedGroup])
      .transition()
      .duration(1000)
      .attr("stroke", function (d) {
        return myColor(selectedGroup);
      })
      .attr(
        "d",
        d3
          .line()
          .x(function (d, i) {
            return x(data.time[i]) + x.bandwidth() / 2;
          })
          .y(function (d) {
            return y(d);
          })
      );
  }

  // Event listener for select element
  d3.select("#selectButton").on("change", function () {
    selectedGroup = this.value;
    update(selectedGroup);
  });
}

// Event listener for search button click
searchButton.addEventListener("click", handleSearch());

// Event listener for Enter key press on input
inputElement.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});
