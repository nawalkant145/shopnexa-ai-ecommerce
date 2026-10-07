import React, { useEffect, useState } from "react";
import {
  Filter,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  X,
  MapPin,
  Check,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyOrders, cancelMyOrder } from "../store/slices/orderSlice";

const Orders = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const { myOrders } = useSelector((state) => state.order);
  const dispatch = useDispatch();

  const handleCancelOrder = (orderId) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      dispatch(cancelMyOrder(orderId));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      if (trackingOrder && trackingOrder.id === orderId) {
        setTrackingOrder(null);
      }
    }
  };

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  const filterOrders = myOrders.filter(
    (order) => statusFilter === "All" || order.order_status === statusFilter
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "Processing":
        return <Package className="w-5 h-5 text-yellow-500" />;
      case "Shipped":
        return <Truck className="w-5 h-5 text-blue-500" />;
      case "Delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "Cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Processing":
        return "bg-yellow-500/20 text-yellow-400";
      case "Shipped":
        return "bg-blue-500/20 text-blue-400";
      case "Delivered":
        return "bg-green-500/20 text-green-400";
      case "Cancelled":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const statusArray = [
    "All",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  const { authUser } = useSelector((state) => state.auth);
  const navigateTo = useNavigate();
  if (!authUser) return navigateTo("/products");

  return (
    <>
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Orders
            </h1>
            <p className="text-muted-foreground">
              Track and manage your order history.
            </p>
          </div>

          {/**STATUS FILTER */}
          <div className="glass-card p-4 mb-8">
            <div className="flex items-center space-x-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-primary" />
                <span className="font-medium"> Filter by status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusArray.map((status) => {
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                        statusFilter === status
                          ? "gradient-primary text-primary-foreground"
                          : "glass-card hover:glow-on-hover"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/**ORDERS LIST */}
          {filterOrders.length === 0 ? (
            <div className="text-center glass-panel max-w-md mx-auto">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No Orders Found
              </h2>
              <p className="text-muted-foreground">
                {statusFilter === "All"
                  ? "You haven't placed any order yet."
                  : `No orders with status "${statusFilter}" found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filterOrders.map((order) => {
                return (
                  <div key={order.id} className="glass-card p-6">
                    {/**ORDER HEADER */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          Order #{order.id}
                        </h3>
                        <p className="text-muted-foreground">
                          Placed on{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.order_status)}
                          <span
                            className={`px-3 py-1 rounded text-sm font-medium capitalize ${getStatusColor(
                              order.order_status
                            )}`}
                          >
                            {order.order_status}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold text-primary">
                            ${order.total_price}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/**ORDER ITEMS */}
                    <div className="space-y-4">
                      {order?.order_items?.map((item) => {
                        return (
                          <div
                            key={item.order_item_id || item.product_id}
                            className="flex items-center space-x-4 p-4 bg-secondary/50 rounded-lg"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">
                                {item.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Quantity : {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                ${item.price}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/**ORDER ACTIONS */}
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[hsla(var(--glass-border))]">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 glass-card hover:glow-on-hover animate-smooth text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setTrackingOrder(order)}
                        className="px-4 py-2 glass-card hover:glow-on-hover animate-smooth text-sm font-medium"
                      >
                        Track Order
                      </button>
                      {order.order_status === "Delivered" && (
                        <>
                          <button className="px-4 py-2 glass-card hover:glow-on-hover animate-smooth text-sm">
                            Write Review
                          </button>
                          <button className="px-4 py-2 glass-card hover:glow-on-hover animate-smooth text-sm">
                            Reorder
                          </button>
                        </>
                      )}

                      {order.order_status === "Processing" && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 glass-card hover:glow-on-hover animate-smooth text-sm text-destructive font-medium"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-6 animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Order Details
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Order ID: {selectedOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Status & Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-xl border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Order Date
                  </p>
                  <p className="font-medium text-foreground mt-1">
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Status
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedOrder.order_status)}
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${getStatusColor(
                        selectedOrder.order_status
                      )}`}
                    >
                      {selectedOrder.order_status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Total Amount
                  </p>
                  <p className="font-bold text-primary text-lg mt-0.5">
                    ${selectedOrder.total_price}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_info && (
                <div className="glass-card p-5 rounded-xl space-y-1.5 border border-border/60">
                  <div className="flex items-center space-x-2 text-primary font-semibold mb-2">
                    <MapPin className="w-5 h-5" />
                    <span>Shipping Address</span>
                  </div>
                  <p className="font-semibold text-foreground text-base">
                    {selectedOrder.shipping_info.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_info.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_info.city},{" "}
                    {selectedOrder.shipping_info.state},{" "}
                    {selectedOrder.shipping_info.country} -{" "}
                    {selectedOrder.shipping_info.pincode}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    Phone: {selectedOrder.shipping_info.phone}
                  </p>
                </div>
              )}

              {/* Ordered Items */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-base">
                  <Package className="w-5 h-5 text-primary" />
                  <span>
                    Items Ordered ({selectedOrder.order_items?.length || 0})
                  </span>
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.order_item_id || item.product_id}
                      className="flex items-center space-x-4 p-3.5 bg-secondary/40 rounded-xl border border-border/50"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Quantity: {item.quantity} × ${item.price}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          ${(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="glass-card p-4 rounded-xl space-y-2 border border-border/60">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>
                    $
                    {(
                      selectedOrder.total_price -
                      (selectedOrder.shipping_price || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                {selectedOrder.shipping_price > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping Fee</span>
                    <span>${selectedOrder.shipping_price}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
                  <span>Total Amount Paid</span>
                  <span className="text-primary">
                    ${selectedOrder.total_price}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRACK ORDER MODAL */}
        {trackingOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-6 md:p-8 w-full max-w-2xl overflow-y-auto space-y-6 animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Track Order Package
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Tracking ID: TRK-{trackingOrder.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTrackingOrder(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Timeline Stepper */}
              <div className="py-2">
                {(() => {
                  const steps = [
                    { label: "Order Placed", desc: "Order confirmed & payment verified" },
                    { label: "Processing", desc: "Items packed at warehouse" },
                    { label: "Shipped", desc: "Handed over to courier partner" },
                    { label: "Delivered", desc: "Package delivered to address" },
                  ];

                  const statusOrder = ["Order Placed", "Processing", "Shipped", "Delivered"];
                  const currentStatus = trackingOrder.order_status;
                  const currentIndex =
                    currentStatus === "Cancelled"
                      ? -1
                      : statusOrder.indexOf(currentStatus) !== -1
                      ? statusOrder.indexOf(currentStatus)
                      : 1;

                  if (currentStatus === "Cancelled") {
                    return (
                      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-2">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                        <h3 className="text-lg font-bold text-red-400">Order Cancelled</h3>
                        <p className="text-sm text-muted-foreground">
                          This order was cancelled and payment refund was initiated.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-6 border-l-2 border-border space-y-8 my-2 ml-4">
                      {steps.map((step, idx) => {
                        const isCompleted = idx <= currentIndex;
                        const isCurrent = idx === currentIndex;

                        return (
                          <div key={step.label} className="relative flex items-start space-x-4">
                            {/* Circle Node */}
                            <div
                              className={`absolute -left-[37px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                  : "bg-secondary text-muted-foreground border border-border"
                              }`}
                            >
                              {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4
                                  className={`font-semibold ${
                                    isCurrent
                                      ? "text-primary text-base"
                                      : isCompleted
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {step.label}
                                </h4>
                                {isCurrent && (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary animate-pulse">
                                    Current Stage
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Destination Address Card */}
              {trackingOrder.shipping_info && (
                <div className="glass-card p-4 rounded-xl flex items-start space-x-3 border border-border/50">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground text-sm">Delivery Destination</p>
                    <p className="text-muted-foreground">{trackingOrder.shipping_info.full_name}</p>
                    <p className="text-muted-foreground">
                      {trackingOrder.shipping_info.address}, {trackingOrder.shipping_info.city},{" "}
                      {trackingOrder.shipping_info.state}, {trackingOrder.shipping_info.country} -{" "}
                      {trackingOrder.shipping_info.pincode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Orders;
