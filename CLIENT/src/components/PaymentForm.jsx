import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "react-toastify";
import { toggleOrderStep } from "../store/slices/orderSlice";
import { clearCart } from "../store/slices/cartSlice";
import { axiosInstance } from "../lib/axios";

const PaymentForm = () => {
  const { currentOrder } = useSelector((state) => state.order); // order info
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  console.log("🧾 Current Order Data:", currentOrder);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const orderId =
        currentOrder?._id || currentOrder?.order_id || currentOrder?.id;
      const totalPrice = currentOrder?.total_price;

      if (!orderId || !totalPrice) {
        toast.error("Invalid order details. Please try again.");
        setIsProcessing(false);
        return;
      }

      console.log("🧾 Creating Razorpay order for amount:", totalPrice);

      const res = await axiosInstance.post("/payment/create", {
        orderId,
        totalPrice,
      });

      const data = res.data;
      console.log("Backend response:", data);

      if (!data.success || !data.orderId) {
        throw new Error(data.message || "Payment initiation failed.");
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "AI E-Commerce Store",
        description: "Order Payment",
        order_id: data.orderId,
        handler: async function (response) {
          try {
            const verifyRes = await axiosInstance.post(
              "/payment/verify",
              response
            );
            const verifyData = verifyRes.data;

            if (verifyData.success) {
              toast.success("Payment Successful!");
              dispatch(clearCart());
              dispatch(toggleOrderStep());
              navigateTo("/");
            } else {
              toast.error(
                verifyData.message || "Payment verification failed!"
              );
            }
          } catch (verifyErr) {
            console.error("Verification Error:", verifyErr);
            toast.error(
              verifyErr.response?.data?.message || "Payment verification failed!"
            );
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
        },
        theme: { color: "#3399cc" },
      };

      // ✅ Ensure Razorpay script is loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        script.onload = () => {
          const razor = new window.Razorpay(options);
          razor.open();
        };
        script.onerror = () => {
          toast.error("Failed to load Razorpay. Please try again.");
        };
        setIsProcessing(false);
        return;
      }

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error("Payment Error:", err.message);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Payment failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="glass-panel">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Razorpay Payment
        </h2>
      </div>

      <div className="flex items-center space-x-2 mb-6 p-4 bg-secondary/50 rounded-lg">
        <Lock className="w-5 h-5 text-green-500" />
        <span className="text-sm text-muted-foreground">
          Your payment is processed securely via Razorpay.
        </span>
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="flex justify-center items-center gap-2 w-full py-3 gradient-primary text-primary-foreground rounded-lg hover:glow-on-hover animate-smooth font-semibold"
      >
        {isProcessing ? (
          <>
            <div
              className={`w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin`}
            />
            <span className="text-white">Processing...</span>
          </>
        ) : (
          "Pay with Razorpay"
        )}
      </button>
    </form>
  );
};

export default PaymentForm;
