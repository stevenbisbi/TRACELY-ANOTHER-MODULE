import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </AuthProvider>
  );
}