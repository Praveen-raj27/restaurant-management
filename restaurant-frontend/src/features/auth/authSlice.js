import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  restaurant: null,
  membership: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (state, action) => {
      const { user, restaurant, membership, accessToken } = action.payload;

      state.user = user;
      state.restaurant = restaurant;
      state.membership = membership;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
    },

    clearCredentials: (state) => {
      state.user = null;
      state.restaurant = null;
      state.membership = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },

    setInitializing: (state, action) => {
      state.isInitializing = action.payload;
    },
    
  },
});

export const { setCredentials, clearCredentials, setInitializing } =
  authSlice.actions;

export default authSlice.reducer;
