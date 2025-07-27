// Check if Chart.js is loaded and element exists
if (typeof Chart !== 'undefined') {
  // Set new default font family and font color
  Chart.defaults.font = {
    family: '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
    color: '#292b2c'
  };

  // Area Chart Example
  const ctx = document.getElementById("myAreaChart");
  if (ctx) {
    const myLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7", "Mar 8", "Mar 9", "Mar 10", "Mar 11", "Mar 12", "Mar 13"],
        datasets: [{
          label: "Sessions",
          tension: 0.3, // Chart.js v3+ uses 'tension' instead of 'lineTension'
          backgroundColor: "rgba(2,117,216,0.2)",
          borderColor: "rgba(2,117,216,1)",
          pointRadius: 5,
          pointBackgroundColor: "rgba(2,117,216,1)",
          pointBorderColor: "rgba(255,255,255,0.8)",
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgba(2,117,216,1)",
          pointHitRadius: 50,
          pointBorderWidth: 2,
          data: [10000, 30162, 26263, 18394, 18287, 28682, 31274, 33259, 25849, 24159, 32651, 31984, 38451],
          fill: true,
        }],
      },
      options: {
        scales: {
          x: {
            type: 'category',
            grid: {
              display: false
            },
            ticks: {
              maxTicksLimit: 7
            }
          },
          y: {
            min: 0,
            max: 40000,
            ticks: {
              maxTicksLimit: 5
            },
            grid: {
              color: "rgba(0, 0, 0, .125)"
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } else {
    console.warn('Chart canvas element "myAreaChart" not found');
  }
} else {
  console.warn('Chart.js library not loaded');
}
