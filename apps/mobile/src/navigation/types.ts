export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Services: undefined;
  Barbers: undefined;
  Calendar: undefined;
  Slots: undefined;
  Confirm: undefined;
  MyBookings: undefined;
  BookingDetail: { booking: import('../state/booking').BookingRecord };
  Profile: undefined;
};
