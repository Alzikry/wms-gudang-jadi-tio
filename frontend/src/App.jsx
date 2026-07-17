import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import StockTransaction from './pages/StockTransaction';
import StockHistory from './pages/StockHistory';
import StockTransfer from './pages/StockTransfer';
import Warehouses from './pages/Warehouses';
import Reports from './pages/Reports';
import StockByWarehouse from './pages/StockByWarehouse';
import StockAdjust from './pages/StockAdjust';
import Users from './pages/Users';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Customers from './pages/Customers';
import SalesOrders from './pages/SalesOrders';
import SalesOrderDetail from './pages/SalesOrderDetail';
import Locations from './pages/Locations';
import StockOpnames from './pages/StockOpnames';
import StockOpnameDetail from './pages/StockOpnameDetail';
import ReorderSuggestions from './pages/ReorderSuggestions';
import BarcodeScanner from './pages/BarcodeScanner';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <StockTransaction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/history"
            element={
              <ProtectedRoute>
                <StockHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/transfer"
            element={
              <ProtectedRoute>
                <StockTransfer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouses"
            element={
              <ProtectedRoute>
                <Warehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/by-warehouse"
            element={
              <ProtectedRoute>
                <StockByWarehouse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock/adjust"
            element={
              <ProtectedRoute>
                <StockAdjust />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute>
                <PurchaseOrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-orders"
            element={
              <ProtectedRoute>
                <SalesOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-orders/:id"
            element={
              <ProtectedRoute>
                <SalesOrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-opnames"
            element={
              <ProtectedRoute>
                <StockOpnames />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-opnames/:id"
            element={
              <ProtectedRoute>
                <StockOpnameDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reorder"
            element={
              <ProtectedRoute>
                <ReorderSuggestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/barcode"
            element={
              <ProtectedRoute>
                <BarcodeScanner />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}