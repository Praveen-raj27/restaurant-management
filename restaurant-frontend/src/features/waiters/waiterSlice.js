
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import waiterService from "./waiterService";

// Fetch restaurant waiters.
export const fetchWaiters = createAsyncThunk(
  "waiters/fetchWaiters",
  async (_, { rejectWithValue }) => {
    try {
      return await waiterService.getWaiters();
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch waiters"
      );
    }
  }
);

// Update waiter availability.
export const updateWaiterAvailability = createAsyncThunk(
  "waiters/updateAvailability",
  async ({ membershipId, availability }, { rejectWithValue }) => {
    try {
      const response = await waiterService.updateAvailability(
        membershipId,
        availability
      );

      return { membershipId, availability, response };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update waiter availability"
      );
    }
  }
);

// Assign a waiter to a table session.
export const assignWaiterToSession = createAsyncThunk(
  "waiters/assignWaiter",
  async ({ sessionId, waiterMembershipId }, { rejectWithValue }) => {
    try {
      const response = await waiterService.assignWaiter(
        sessionId,
        waiterMembershipId
      );

      return { sessionId, waiterMembershipId, response };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to assign waiter"
      );
    }
  }
);

const initialState = {
  waiters: [],
  loading: false,
  updating: false,
  assigning: false,
  error: null,
};

const waiterSlice = createSlice({
  name: "waiters",
  initialState,
  reducers: {
    clearWaiterError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch waiters
      .addCase(fetchWaiters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWaiters.fulfilled, (state, action) => {
        state.loading = false;

        const payload = action.payload;

        state.waiters = Array.isArray(payload)
          ? payload
          : payload?.data ?? payload?.waiters ?? [];
      })
      .addCase(fetchWaiters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update availability
      .addCase(updateWaiterAvailability.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateWaiterAvailability.fulfilled, (state, action) => {
        state.updating = false;

        const { membershipId, availability } = action.payload;

        const waiter = state.waiters.find(
          (item) => item.id === membershipId
        );

        if (waiter) {
          waiter.waiterAvailability = availability;
          waiter.availabilityUpdatedAt = new Date().toISOString();
        }
      })
      .addCase(updateWaiterAvailability.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })

      // Assign waiter
      .addCase(assignWaiterToSession.pending, (state) => {
        state.assigning = true;
        state.error = null;
      })
      .addCase(assignWaiterToSession.fulfilled, (state) => {
        state.assigning = false;
      })
      .addCase(assignWaiterToSession.rejected, (state, action) => {
        state.assigning = false;
        state.error = action.payload;
      });
  },
});

export const { clearWaiterError } = waiterSlice.actions;

export default waiterSlice.reducer;
