// Check if Chart.js is loaded and element exists
if (typeof Chart !== 'undefined') {
  // Set new default font family and font color to mimic Bootstrap's default styling
  Chart.defaults.font = {
    family: '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'
  };
  Chart.defaults.color = '#292b2c';

  // Bar Chart Example
  var ctx = document.getElementById("myBarChart");
  if (ctx) {
    var myBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ["January", "February", "March", "April", "May", "June"],
        datasets: [{
          label: "Revenue",
          backgroundColor: "rgba(2,117,216,1)",
          borderColor: "rgba(2,117,216,1)",
          data: [4215, 5312, 6251, 7841, 9821, 14984],
        }],
      },
      options: {
        scales: {
          x: {
            time: {
              unit: 'month'
            },
            grid: {
              display: false
            },
            ticks: {
              maxTicksLimit: 6
            }
          },
          y: {
            ticks: {
              min: 0,
              max: 15000,
              maxTicksLimit: 5
            },
            grid: {
              display: true
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
    console.warn('Chart canvas element "myBarChart" not found');
  }
} else {
  console.warn('Chart.js library not loaded');
}
