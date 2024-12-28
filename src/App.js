import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";
import moment from "moment";
import { Container, Row, Col, Table, Card } from "react-bootstrap"; // Import Bootstrap components

const App = () => {
  const [data, setData] = useState([]); // Sensor data fetched from API
  const [datasets, setDatasets] = useState([]);
  const [latestDataByDate, setLatestDataByDate] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [dates, setDates] = useState([]);
  const [lifetimeCost, setLifetimeCost] = useState(0); // Define the lifetime cost state
  const [startDate, setStartDate] = useState(""); // Start date for the range
  const [endDate, setEndDate] = useState(""); // End date for the range
  const [totalCost, setTotalCost] = useState(0); // Total cost for the range
  const [filteredData, setFilteredData] = useState([]);

  // Fetch data from the backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/data");
        const fetchedData = response.data.map((item) => ({
          ...item,
          dailyCost: calculateDailyCost(item.energy), // Add daily cost
        }));

        setData(fetchedData);

        const history = [];
        const uniqueDates = [...new Set(fetchedData.map((item) => item.date))];
        uniqueDates.forEach((date) => {
          const dateData = fetchedData.filter((item) => item.date === date);
          history.push({ date, records: dateData });
        });
        setHistoryData(history);
        setDates(uniqueDates);

        const latestDataGroupedByDate = getLatestDataByDate(fetchedData);
        setLatestDataByDate(latestDataGroupedByDate);

        const chartData = getChartData(fetchedData);
        setDatasets(chartData.datasets);

        setLifetimeCost(calculateLifetimeCost(fetchedData)); // Calculate lifetime cost
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleCalculateCost = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    // Filter data for the selected dates
    const filtered = data.filter((item) => {
      const itemDate = moment(item.date, "YYYY-MM-DD");
      return (
        itemDate.isSameOrAfter(moment(startDate)) &&
        itemDate.isSameOrBefore(moment(endDate))
      );
    });

    // If no data for selected range, show a message
    if (filtered.length === 0) {
      alert("No data available for the selected date range.");
      setFilteredData([]);
      setTotalCost(0);
      return;
    }

    // Group by date and get the latest record for each date
    const groupedByDate = filtered.reduce((acc, item) => {
      if (
        !acc[item.date] ||
        moment(item.timestamp).isAfter(moment(acc[item.date].timestamp))
      ) {
        acc[item.date] = item; // Keep the latest record for each date
      }
      return acc;
    }, {});

    const latestEntries = Object.values(groupedByDate);

    // Retrieve the latest records for start and end dates
    const startEntry = groupedByDate[startDate];
    const endEntry = groupedByDate[endDate];

    if (!startEntry || !endEntry) {
      alert("No data available for one of the selected dates.");
      setFilteredData([]);
      setTotalCost(0);
      return;
    }

    // Calculate the total cost ensuring no negative values
    let total =
      parseFloat(endEntry.dailyCost) - parseFloat(startEntry.dailyCost);

    if (total < 0) {
      total = Math.abs(total); // Ensure positive value
    }

    setFilteredData(latestEntries); // Update filtered data state
    setTotalCost(total.toFixed(2)); // Update total cost state
  };

  // Function to get the latest data for each date
  const getLatestDataByDate = (data) => {
    const groupedData = {};

    // Group the data by date
    data.forEach((item) => {
      if (!groupedData[item.date]) {
        groupedData[item.date] = [];
      }
      groupedData[item.date].push(item);
    });

    // Extract the latest data for each date
    const latestData = [];
    Object.keys(groupedData).forEach((date) => {
      const latestRecord = groupedData[date].reduce((latest, current) => {
        return moment(current.timestamp).isAfter(moment(latest.timestamp))
          ? current
          : latest;
      });
      latestData.push(latestRecord);
    });

    return latestData;
  };

  // Prepare chart data
  const getChartData = (data) => {
    if (!data.length) return {};

    const chartData = {
      labels: data.map((item) => moment(item.timestamp).format("HH:mm:ss")),
      datasets: [
        {
          label: "Voltage (V)",
          data: data.map((item) => item.voltage),
          fill: false,
          borderColor: "rgb(255, 99, 132)",
          tension: 0.1,
        },
        {
          label: "Current (A)",
          data: data.map((item) => item.current),
          fill: false,
          borderColor: "rgb(54, 162, 235)",
          tension: 0.1,
        },
        {
          label: "Power (W)",
          data: data.map((item) => item.power),
          fill: false,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
        {
          label: "Energy (kWh)",
          data: data.map((item) => item.energy),
          fill: false,
          borderColor: "rgb(153, 102, 255)",
          tension: 0.1,
        },
        {
          label: "Frequency (Hz)",
          data: data.map((item) => item.frequency),
          fill: false,
          borderColor: "rgb(255, 159, 64)",
          tension: 0.1,
        },
        {
          label: "Power Factor",
          data: data.map((item) => item.pf),
          fill: false,
          borderColor: "rgb(255, 205, 86)",
          tension: 0.1,
        },
      ],
    };

    return chartData;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        {/* Latest Data for Each Date - Full Width */}
        <Col sm={12}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Latest Data by Date</Card.Title>
              {latestDataByDate.length > 0 && (
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <Table bordered responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voltage</th>
                        <th>Current</th>
                        <th>Power</th>
                        <th>Energy (kWh)</th>
                        <th>Frequency</th>
                        <th>Power Factor</th>
                        <th>Daily Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestDataByDate.map((item, index) => (
                        <tr key={index}>
                          <td>{item.date}</td>
                          <td>{item.voltage}</td>
                          <td>{item.current}</td>
                          <td>{item.power}</td>
                          <td>{item.energy}</td>
                          <td>{item.frequency}</td>
                          <td>{item.pf}</td>
                          <td>{item.dailyCost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col sm={12}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Calculate Cost for Date Range</Card.Title>
              <Row className="mb-3">
                <Col md={4}>
                  <label>From Date:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <label>To Date:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <button
                    className="btn btn-primary w-100"
                    onClick={handleCalculateCost}
                  >
                    Calculate Cost
                  </button>
                </Col>
              </Row>
              {filteredData.length > 0 && (
                <>
                  <h5>Total Cost: ₹ {totalCost}</h5>
                  <Table bordered responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voltage</th>
                        <th>Current</th>
                        <th>Power</th>
                        <th>Energy (kWh)</th>
                        <th>Frequency</th>
                        <th>Power Factor</th>
                        <th>Daily Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.date}</td>
                          <td>{item.voltage}</td>
                          <td>{item.current}</td>
                          <td>{item.power}</td>
                          <td>{item.energy}</td>
                          <td>{item.frequency}</td>
                          <td>{item.pf}</td>
                          <td>{item.dailyCost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* Data Graph - Full Width */}
        <Col sm={12}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Data Graph</Card.Title>
              <Line
                data={{
                  labels: data.map((item) =>
                    moment(item.timestamp).format("HH:mm:ss")
                  ),
                  datasets,
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* History Data */}
        <Col sm={12}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>History</Card.Title>
              <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                {historyData.map((item, index) => (
                  <div key={index}>
                    <h5>{item.date}</h5>
                    <Table bordered responsive>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Voltage</th>
                          <th>Current</th>
                          <th>Power</th>
                          <th>Energy</th>
                          <th>Frequency</th>
                          <th>Power Factor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.records.map((record, idx) => (
                          <tr key={idx}>
                            <td>
                              {moment(record.timestamp).format("HH:mm:ss")}
                            </td>
                            <td>{record.voltage}</td>
                            <td>{record.current}</td>
                            <td>{record.power}</td>
                            <td>{record.energy}</td>
                            <td>{record.frequency}</td>
                            <td>{record.pf}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* <Row>
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Lifetime Energy Cost</Card.Title>
              <h4>₹ {lifetimeCost}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row> */}
    </Container>
  );
};

export default App;

const calculateDailyCost = (energy) => {
  let cost = 0;

  if (energy <= 50) {
    cost = energy * 3.25;
  } else if (energy <= 100) {
    cost = 50 * 3.25 + (energy - 50) * 4.05;
  } else if (energy <= 150) {
    cost = 50 * 3.25 + 50 * 4.05 + (energy - 100) * 5.1;
  } else if (energy <= 200) {
    cost = 50 * 3.25 + 50 * 4.05 + 50 * 5.1 + (energy - 150) * 6.95;
  } else if (energy <= 250) {
    cost = 50 * 3.25 + 50 * 4.05 + 50 * 5.1 + 50 * 6.95 + (energy - 200) * 8.2;
  }

  return cost.toFixed(2);
};

const calculateLifetimeCost = (data) => {
  return data
    .reduce(
      (total, item) => total + parseFloat(calculateDailyCost(item.energy)),
      0
    )
    .toFixed(2);
};
