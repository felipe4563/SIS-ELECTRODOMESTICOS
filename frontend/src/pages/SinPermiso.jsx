import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';

export default function SinPermiso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">

        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 rounded-full p-6 border border-red-500/30">
            <FaShieldAlt className="h-16 w-16 text-red-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">403</h1>
        <h2 className="text-xl font-semibold text-white/80 mb-3">Acceso denegado</h2>
        <p className="text-white/50 text-sm mb-8">
          No tienes permisos para acceder a esta sección.
          Contacta al administrador si crees que es un error.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10"
          >
            <FaArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all shadow-lg"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
