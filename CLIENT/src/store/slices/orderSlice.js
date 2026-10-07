import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

// ✅ Fetch all orders for logged-in user
export const fetchMyOrders = createAsyncThunk(
  "order/orders/me",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/order/orders/me");
      return res.data.myOrders;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  }
);

// ✅ Place a new order
export const placeOrder = createAsyncThunk(
  "order/new",
  async (data, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/order/new", data, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      toast.success(res.data.message || "Order placed successfully!");
      return res.data; // includes total_price, order_id, etc.
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to place order, try again."
      );
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  }
);

// ✅ Cancel an order
export const cancelMyOrder = createAsyncThunk(
  "order/cancel",
  async (orderId, thunkAPI) => {
    try {
      const res = await axiosInstance.put(`/order/cancel/${orderId}`);
      toast.success(res.data.message || "Order cancelled successfully!");
      thunkAPI.dispatch(fetchMyOrders());
      return res.data.order;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to cancel order.";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const orderSlice = createSlice({
  name: "order",
  initialState: {
    myOrders: [],
    fetchingOrders: false,
    placingOrder: false,
    finalPrice: null,
    orderStep: 1,
    currentOrder: null, // store full order for Razorpay
  },
  reducers: {
    toggleOrderStep(state) {
      state.orderStep = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.fetchingOrders = true;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.fetchingOrders = false;
        state.myOrders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state) => {
        state.fetchingOrders = false;
      })
      .addCase(placeOrder.pending, (state) => {
        state.placingOrder = true;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placingOrder = false;
        state.finalPrice = action.payload.total_price;
        state.currentOrder = {
          _id: action.payload.order_id,
          total_price: action.payload.total_price,
        };
        state.orderStep = 2;
      })
      .addCase(placeOrder.rejected, (state) => {
        state.placingOrder = false;
      });
  },
});

export default orderSlice.reducer;
export const { toggleOrderStep } = orderSlice.actions;
