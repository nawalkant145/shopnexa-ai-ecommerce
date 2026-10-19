import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import { data } from "react-router-dom";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    user: null,
    isAuthenticated: false,
    resetUrl: null,
  },
  reducers: {
    loginRequest(state) { state.loading = true; },
    loginSuccess(state, action) {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    loginFailed(state) { state.loading = false; },

    getUserRequest(state) { state.loading = true; },
    getUserSuccess(state, action) {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    getUserFailed(state) {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
    },

    logoutRequest(state) { state.loading = true; },
    logoutSuccess(state) {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.resetUrl = null;
    },
    logoutFailed(state) { state.loading = false; },

    forgotPasswordRequest(state) {
      state.loading = true;
      state.resetUrl = null;
    },
    forgotPasswordSuccess(state, action) {
      state.loading = false;
      state.resetUrl = action.payload || null;
    },
    forgotPasswordFailed(state) { state.loading = false; },

    resetPasswordRequest(state) { state.loading = true; },
    resetPasswordSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    resetPasswordFailed(state) { state.loading = false; },

    updateProfileRequest(state) { state.loading = true; },
    updateProfileSuccess(state, action) {
      state.loading = false;
      state.user = action.payload;
    },
    updateProfileFailed(state) { state.loading = false; },

    updatePasswordRequest(state) { state.loading = true; },
    updatePasswordSuccess(state) { state.loading = false; },
    updatePasswordFailed(state) { state.loading = false; },

    resetAuthSlice(state) {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());
  try {
    const res = await axiosInstance.post("/auth/login", data);
    if (res.data.user.role === "Admin") {
      dispatch(authSlice.actions.loginSuccess(res.data.user));
      toast.success(res.data.message);
    } else {
      dispatch(authSlice.actions.loginFailed());
      toast.error("You are not authorized to access admin panel.");
    }
  } catch (error) {
    dispatch(authSlice.actions.loginFailed());
    toast.error(error.response?.data?.message || "Login failed.");
  }
};

export const getUser = () => async (dispatch) => {
  dispatch(authSlice.actions.getUserRequest());
  try {
    const res = await axiosInstance.get("/auth/me");
    dispatch(authSlice.actions.getUserSuccess(res.data.user));
  } catch (error) {
    dispatch(authSlice.actions.getUserFailed());
  }
};

export const logout = () => async (dispatch) => {
  dispatch(authSlice.actions.logoutRequest());
  try {
    const res = await axiosInstance.get("/auth/logout");
    dispatch(authSlice.actions.logoutSuccess());
    toast.success(res.data.message);
  } catch (error) {
    dispatch(authSlice.actions.logoutFailed());
    toast.error(error.response?.data?.message || "Logout failed.");
  }
};

export const forgotPassword = (email) => async (dispatch) => {
  dispatch(authSlice.actions.forgotPasswordRequest());
  try {
    const frontendUrl =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "http://localhost:5174";
    const cleanEmail = typeof email === "string" ? email.trim() : email;
    const res = await axiosInstance.post(
      `/auth/password/forgot?frontendUrl=${encodeURIComponent(frontendUrl)}`,
      { email: cleanEmail }
    );
    dispatch(authSlice.actions.forgotPasswordSuccess(res.data.resetUrl || null));
    if (res.data.resetUrl) {
      toast.info("Password reset link ready! Click the on-screen button below.");
    } else {
      toast.success(res.data.message || "Password reset link sent to your email!");
    }
  } catch (error) {
    dispatch(authSlice.actions.forgotPasswordFailed());
    const errMsg =
      error.response?.data?.message ||
      (error.message === "Network Error"
        ? "Network Error: Cannot connect to server."
        : "Cannot request reset password.");
    toast.error(errMsg);
  }
};

export const resetPassword = (newData, token) => async (dispatch) => {
  dispatch(authSlice.actions.resetPasswordRequest());
  try {
    const res = await axiosInstance.put(`/auth/password/reset/${token}`, newData);
    dispatch(authSlice.actions.resetPasswordSuccess(res.data.user));
    toast.success(res.data.message || "Password reset successfully!");
  } catch (error) {
    dispatch(authSlice.actions.resetPasswordFailed());
    toast.error(error.response?.data?.message || "Failed to reset password.");
  }
};

export const updateAdminProfile = (data) => async (dispatch) => {
  dispatch(authSlice.actions.updateProfileRequest());
  try {
    const res = await axiosInstance.put(`/auth/profile/update`, data);
    dispatch(authSlice.actions.updateProfileSuccess(res.data.user));
    toast.success(res.data.message || "Profile updated successfully");
  } catch (error) {
    dispatch(authSlice.actions.updateProfileFailed());
    toast.error(error.response?.data?.message || "Failed to update profile.");
  }
};

export const updateAdminPassword = (data) => async (dispatch) => {
  dispatch(authSlice.actions.updatePasswordRequest());
  try {
    const res = await axiosInstance.put(`/auth/password/update`, data);
    dispatch(authSlice.actions.updatePasswordSuccess());
    toast.success(res.data.message || "Password updated successfully");
  } catch (error) {
    dispatch(authSlice.actions.updatePasswordFailed());
    toast.error(error.response?.data?.message || "Failed to update password.");
  }
};

export const resetAuthSlice = () => (dispatch) => {
  dispatch(authSlice.actions.resetAuthSlice());
};

export default authSlice.reducer;
