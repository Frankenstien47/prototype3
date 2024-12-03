
const Order=require('../../models/OrderSchema')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment=require('moment');




// controller to render salesReport page
exports.getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, reportType = 'daily' } = req.query;
        
        const query = { orderStatus: { $ne: 'Cancelled' } };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid start date format' });
                }
                query.createdAt.$gte = parsedStartDate;
            }
            if (endDate) {
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid end date format' });
                }
                query.createdAt.$lte = parsedEndDate;
            }
        }

        const orders = await Order.find(query);
        let aggregatedOrders;
        let report;

        switch(reportType) {
            case 'monthly':
                aggregatedOrders = aggregateSalesByMonth(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            case 'weekly':
                aggregatedOrders = aggregateSalesByWeek(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            default:
                aggregatedOrders = orders;
                report = {
                    totalSalesCount: orders.length,
                    totalOrderAmount: orders.reduce((sum, order) => sum + order.subtotal, 0),
                    totalDiscount: orders.reduce((sum, order) => sum + order.discountAmount, 0),
                    netSales: orders.reduce((sum, order) => sum + order.finalAmount, 0)
                };
                break;
        }

        res.render('adminLayout', {
            content: 'partials/salesReport',
            title: 'salesReport',
            orders: aggregatedOrders,
            report,
            startDate,
            endDate,
            reportType,
            moment: require('moment') 
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).send('Server Error');
    }
};

function aggregateSalesByMonth(orders) {
    const monthlyAggregation = {};

    orders.forEach(order => {
        const monthKey = moment(order.createdAt).format('YYYY-MM');
    
        if (!monthlyAggregation[monthKey]) {
            monthlyAggregation[monthKey] = {
                createdAt: moment(order.createdAt).startOf('month').toDate(),
                subtotal: 0,
                discountAmount: 0,
                finalAmount: 0,
                orderCount: 0
            };
        }
        monthlyAggregation[monthKey].subtotal += order.subtotal;
        monthlyAggregation[monthKey].finalAmount += order.finalAmount;
        monthlyAggregation[monthKey].discountAmount += order.discountAmount;
        monthlyAggregation[monthKey].orderCount++;
    });
    
    return Object.values(monthlyAggregation);
}

function aggregateSalesByWeek(orders) {
    const weeklyAggregation = {};

    orders.forEach(order => {
        const weekKey = moment(order.createdAt).format('YYYY-WW');

        if (!weeklyAggregation[weekKey]) {
            weeklyAggregation[weekKey] = {
                createdAt: moment(order.createdAt).startOf('week').toDate(),
                finalAmount: 0,
                subtotal: 0,
                orderCount: 0,
                discountAmount: 0,
            };
        }
        weeklyAggregation[weekKey].subtotal += order.subtotal;
        weeklyAggregation[weekKey].discountAmount += order.discountAmount;
        weeklyAggregation[weekKey].finalAmount += order.finalAmount;
        weeklyAggregation[weekKey].orderCount++;
    });
    
    return Object.values(weeklyAggregation);
}

function calculateReportSummary(aggregatedOrders) {
    const orders = Array.isArray(aggregatedOrders) ? aggregatedOrders : [];

    return {
        totalSalesCount: orders.reduce((sum, order) => sum + (order.orderCount), 0),
        totalOrderAmount: orders.reduce((sum, order) => sum + (order.subtotal), 0),
        totalDiscount: orders.reduce((sum, order) => sum + (order.discountAmount), 0),
        netSales: orders.reduce((sum, order) => sum + (order.finalAmount), 0)
    };
}
// controller to download salesReport PDF
exports.downloadSalesReportPDF = async (req, res) => {
    try {
        const { startDate, endDate, reportType = 'daily' } = req.query;
        
        const query = { orderStatus: { $ne: 'Cancelled' } };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid start date format' });
                }
                query.createdAt.$gte = parsedStartDate;
            }
            if (endDate) {
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid end date format' });
                }
                query.createdAt.$lte = parsedEndDate;
            }
        }

        const orders = await Order.find(query);
        let aggregatedOrders;
        let report;

        switch(reportType) {
            case 'monthly':
                aggregatedOrders = aggregateSalesByMonth(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            case 'weekly':
                aggregatedOrders = aggregateSalesByWeek(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            default:
                aggregatedOrders = orders;
                report = {
                    totalSalesCount: orders.length,
                    totalOrderAmount: orders.reduce((sum, order) => sum + order.subtotal, 0),
                    totalDiscount: orders.reduce((sum, order) => sum + order.discountAmount, 0),
                    netSales: orders.reduce((sum, order) => sum + order.finalAmount, 0)
                };
                break;
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

        doc.text(`Sales Report ${startDate ? `from ${startDate}` : ''} ${endDate ? `to ${endDate}` : ''}`, { align: 'center' });
        doc.moveDown();
        doc.text(`Total Sales Count: ${report.totalSalesCount}`);
        doc.text(`Total Order Amount: ${report.totalOrderAmount.toFixed(2)}`);
        doc.text(`Total Discount: ${report.totalDiscount.toFixed(2)}`);
        doc.text(`Net Sales: ${report.netSales.toFixed(2)}`);
        doc.end();

        doc.pipe(res);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Server Error');
    }
};
// controller to download to salesReport as Excel sheet
exports.downloadSalesReportExcel = async (req, res) => {
    try {
        const { startDate, endDate, reportType = 'daily' } = req.query;
        
        const query = { orderStatus: { $ne: 'Cancelled' } };
       
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid start date format' });
                }
                query.createdAt.$gte = parsedStartDate;
            }
            if (endDate) {
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid end date format' });
                }
                query.createdAt.$lte = parsedEndDate;
            }
        }

        const orders = await Order.find(query);
        let aggregatedOrders;
        let report;

        switch(reportType) {
            case 'monthly':
                aggregatedOrders = aggregateSalesByMonth(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            case 'weekly':
                aggregatedOrders = aggregateSalesByWeek(orders);
                report = calculateReportSummary(aggregatedOrders);
                break;
            default:
                aggregatedOrders = orders;
                report = {
                    totalSalesCount: orders.length,
                    totalOrderAmount: orders.reduce((sum, order) => sum + order.subtotal, 0),
                    totalDiscount: orders.reduce((sum, order) => sum + order.discountAmount, 0),
                    netSales: orders.reduce((sum, order) => sum + order.finalAmount, 0)
                };
                break;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Report');

        sheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'finalAmount', width: 15 }
        ];

        aggregatedOrders.forEach(order => {
            sheet.addRow({
                date: order.createdAt.toISOString().slice(0, 10),
                subtotal: order.subtotal,
                discount: order.discountAmount,
                finalAmount: order.finalAmount
            });
        });

        sheet.addRow({}).commit();
        sheet.addRow({
            date: 'Totals',
            subtotal: report.totalOrderAmount,
            discount: report.totalDiscount,
            finalAmount: report.netSales
        }).commit();

        res.setHeader(
            'Content-Disposition',
            'attachment; filename="sales_report.xlsx"'
        );
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Server Error');
    }
};