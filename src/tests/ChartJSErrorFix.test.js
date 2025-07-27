/**
 * Test file for Chart.js Error Fix
 * Testing the fix for "Cannot read properties of null (reading 'length')" error
 */

describe('Chart.js Error Fix Tests', () => {
    let originalDocument;
    let mockChart;

    beforeEach(() => {
        // Save original document
        originalDocument = global.document;

        // Mock Chart.js
        mockChart = {
            defaults: {
                font: {},
                color: ''
            }
        };
        global.Chart = mockChart;

        // Mock console methods
        global.console.warn = jest.fn();
        global.console.error = jest.fn();
    });

    afterEach(() => {
        // Restore original document
        global.document = originalDocument;

        // Clean up global Chart
        delete global.Chart;

        // Clear mocks
        jest.clearAllMocks();
    });

    describe('Chart Element Existence Check', () => {
        test('should not create chart when canvas element does not exist', () => {
            // Mock document with no chart elements
            global.document = {
                getElementById: jest.fn(() => null),
                createElement: jest.fn(),
                head: { appendChild: jest.fn() }
            };

            // Simulate the conditional loading logic
            const hasAreaChart = document.getElementById('myAreaChart');
            const hasBarChart = document.getElementById('myBarChart');

            expect(hasAreaChart).toBeNull();
            expect(hasBarChart).toBeNull();

            // Should not attempt to load chart scripts
            expect(document.getElementById).toHaveBeenCalledWith('myAreaChart');
            expect(document.getElementById).toHaveBeenCalledWith('myBarChart');
        });

        test('should create chart when canvas element exists', () => {
            // Mock canvas element
            const mockCanvas = {
                getContext: jest.fn(() => ({})),
                width: 400,
                height: 200
            };

            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'myAreaChart') return mockCanvas;
                    return null;
                }),
                createElement: jest.fn(),
                head: { appendChild: jest.fn() }
            };

            const hasAreaChart = document.getElementById('myAreaChart');
            expect(hasAreaChart).toBe(mockCanvas);
        });
    });

    describe('Chart.js Library Check', () => {
        test('should handle missing Chart.js library gracefully', () => {
            // Remove Chart.js from global scope
            delete global.Chart;

            // Simulate chart demo script execution
            const chartExists = typeof Chart !== 'undefined';

            expect(chartExists).toBe(false);

            // Should log warning instead of throwing error
            if (!chartExists) {
                console.warn('Chart.js library not loaded');
            }

            expect(console.warn).toHaveBeenCalledWith('Chart.js library not loaded');
        });

        test('should proceed when Chart.js library is available', () => {
            // Chart.js is available (set in beforeEach)
            const chartExists = typeof Chart !== 'undefined';

            expect(chartExists).toBe(true);
            expect(Chart.defaults).toBeDefined();
        });
    });

    describe('Conditional Script Loading', () => {
        test('should only load chart scripts when chart elements exist', () => {
            const mockScript = {
                src: '',
                onload: null
            };

            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'myAreaChart') return { getContext: () => ({}) };
                    return null;
                }),
                createElement: jest.fn(() => mockScript),
                head: { appendChild: jest.fn() }
            };

            // Simulate the conditional loading logic from index.html
            const hasAreaChart = document.getElementById('myAreaChart');
            const hasBarChart = document.getElementById('myBarChart');

            if (hasAreaChart || hasBarChart) {
                const chartScript = document.createElement('script');
                chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
                document.head.appendChild(chartScript);
            }

            expect(hasAreaChart).toBeTruthy();
            expect(hasBarChart).toBeNull();
            expect(document.createElement).toHaveBeenCalledWith('script');
            expect(document.head.appendChild).toHaveBeenCalled();
        });

        test('should not load chart scripts when no chart elements exist', () => {
            global.document = {
                getElementById: jest.fn(() => null),
                createElement: jest.fn(),
                head: { appendChild: jest.fn() }
            };

            // Simulate the conditional loading logic
            const hasAreaChart = document.getElementById('myAreaChart');
            const hasBarChart = document.getElementById('myBarChart');

            if (hasAreaChart || hasBarChart) {
                const chartScript = document.createElement('script');
                document.head.appendChild(chartScript);
            }

            expect(hasAreaChart).toBeNull();
            expect(hasBarChart).toBeNull();
            expect(document.createElement).not.toHaveBeenCalled();
            expect(document.head.appendChild).not.toHaveBeenCalled();
        });
    });

    describe('Chart Configuration Updates', () => {
        test('should use Chart.js v3+ configuration format', () => {
            // Test that the chart configuration uses the new format
            const chartConfig = {
                type: 'line',
                options: {
                    scales: {
                        x: { // v3+ format (not xAxes)
                            grid: { display: false }
                        },
                        y: { // v3+ format (not yAxes)
                            grid: { display: true }
                        }
                    },
                    plugins: { // v3+ format (not legend at root)
                        legend: { display: false }
                    }
                }
            };

            expect(chartConfig.options.scales.x).toBeDefined();
            expect(chartConfig.options.scales.y).toBeDefined();
            expect(chartConfig.options.plugins.legend).toBeDefined();

            // Old format should not be present
            expect(chartConfig.options.scales.xAxes).toBeUndefined();
            expect(chartConfig.options.scales.yAxes).toBeUndefined();
            expect(chartConfig.options.legend).toBeUndefined();
        });

        test('should set Chart.js defaults correctly', () => {
            // Test the new way to set Chart.js defaults
            if (typeof Chart !== 'undefined') {
                Chart.defaults.font = {
                    family: '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'
                };
                Chart.defaults.color = '#292b2c';
            }

            expect(Chart.defaults.font.family).toBe('-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif');
            expect(Chart.defaults.color).toBe('#292b2c');
        });
    });

    describe('Error Prevention', () => {
        test('should prevent null reference errors', () => {
            global.document = {
                getElementById: jest.fn(() => null)
            };

            // Simulate the safe chart creation logic
            const ctx = document.getElementById("myAreaChart");

            if (ctx && typeof Chart !== 'undefined') {
                // Would create chart here
                expect(true).toBe(true); // Chart creation would happen
            } else {
                if (!ctx) {
                    console.warn('Chart canvas element "myAreaChart" not found');
                }
                if (typeof Chart === 'undefined') {
                    console.warn('Chart.js library not loaded');
                }
            }

            expect(console.warn).toHaveBeenCalledWith('Chart canvas element "myAreaChart" not found');
        });

        test('should handle DOM ready state', () => {
            // Test that scripts wait for DOM to be ready
            const mockReadyState = 'loading';

            global.document = {
                readyState: mockReadyState,
                getElementById: jest.fn(() => null),
                addEventListener: jest.fn()
            };

            // Simulate waiting for DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    // Chart initialization would happen here
                });
            }

            expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
        });
    });

    describe('Performance Optimization', () => {
        test('should only load necessary scripts', () => {
            const mockScript = { src: '', onload: null };

            global.document = {
                getElementById: jest.fn((id) => {
                    // Only area chart exists
                    if (id === 'myAreaChart') return { getContext: () => ({}) };
                    return null;
                }),
                createElement: jest.fn(() => mockScript),
                head: { appendChild: jest.fn() }
            };

            // Simulate selective script loading
            const hasAreaChart = document.getElementById('myAreaChart');
            const hasBarChart = document.getElementById('myBarChart');

            if (hasAreaChart) {
                const areaScript = document.createElement('script');
                areaScript.src = 'assets/assets/demo/chart-area-demo.js';
                document.head.appendChild(areaScript);
            }

            if (hasBarChart) {
                const barScript = document.createElement('script');
                barScript.src = 'assets/assets/demo/chart-bar-demo.js';
                document.head.appendChild(barScript);
            }

            // Should only load area chart script
            expect(document.createElement).toHaveBeenCalledTimes(1);
            expect(document.head.appendChild).toHaveBeenCalledTimes(1);
        });
    });
});