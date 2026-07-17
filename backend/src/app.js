const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const stockRoutes = require('./routes/stockRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesOrderRoutes = require('./routes/salesOrderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const binRoutes = require('./routes/binRoutes');
const stockOpnameRoutes = require('./routes/stockOpnameRoutes');
const barcodeRoutes = require('./routes/barcodeRoutes');
const reorderRoutes = require('./routes/reorderRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');


const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/stock-opnames', stockOpnameRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/reorder', reorderRoutes);
app.use('/api/users', userRoutes);


app.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));
app.use(errorHandler);

module.exports = app;