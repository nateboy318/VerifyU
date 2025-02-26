export interface Student {
  id: string;
  name: string;
  timestamp: Date;
  imagePath?: string; // Path to the stored ID image
}

export type RootStackParamList = {
  Home: undefined;
  IDScanner: undefined;
  IDScannerFallback: undefined;
  AttendanceList: undefined;
};