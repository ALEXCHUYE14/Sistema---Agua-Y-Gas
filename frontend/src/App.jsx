import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Droplet, Truck } from "lucide-react";
import ClientePWA from "./components/ClientePWA";
import RepartidorRutas from "./components/RepartidorRutas";

function NavSwitcher() {
  const location = useLocation();
  const esRepartidor = location.pathname.startsWith("/repartidor");

  return (
    <nav className="fixed top-3 right-3 z-50">
      <Link
        to={esRepartidor ? "/" : "/repartidor"}
        className="flex items-center gap-1.5 bg-white/90 backdrop-blur shadow-lg rounded-full px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200"
      >
        {esRepartidor ? (
          <>
            <Droplet className="w-4 h-4 text-agua" /> Vista Cliente
          </>
        ) : (
          <>
            <Truck className="w-4 h-4 text-slate-700" /> Vista Repartidor
          </>
        )}
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <NavSwitcher />
      <Routes>
        <Route path="/" element={<ClientePWA />} />
        <Route path="/repartidor" element={<RepartidorRutas />} />
        <Route path="*" element={<ClientePWA />} />
      </Routes>
    </>
  );
}
