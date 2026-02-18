import React, { useState, useEffect } from 'react';
import { Search, X, User, Phone, MapPin, Calendar, Activity, AlertTriangle } from 'lucide-react';
import { Patient, RiskLevel } from '../../types';
import { SuperadminService } from '../../services/backend/superadminService';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient?: (patient: Patient) => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const service = new SuperadminService();

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      const searchPatients = async () => {
        setLoading(true);
        try {
          const results = await service.searchPatients(searchQuery);
          setPatients(results);
        } catch (error) {
          console.error('Error searching patients:', error);
          setPatients([]);
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(searchPatients, 300);
      return () => clearTimeout(debounce);
    } else {
      setPatients([]);
    }
  }, [searchQuery, isOpen]);

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.CRITICAL:
        return 'bg-red-500 text-white';
      case RiskLevel.HIGH:
        return 'bg-orange-500 text-white';
      case RiskLevel.MEDIUM:
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Search Patients
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Search across all facilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or location..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-[#2c2c2e] border-none rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-brand-600 mx-auto mb-4" style={{ width: 32, height: 32 }}>
                <Search size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Searching...</p>
            </div>
          ) : patients.length > 0 ? (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    if (onSelectPatient) {
                      onSelectPatient(patient);
                    }
                  }}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg cursor-pointer transition-all bg-white dark:bg-[#1c1c1e]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm
                        ${getRiskColor(patient.riskStatus)}
                      `}>
                        {patient.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                          {patient.name}
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Phone size={14} />
                            <span>{patient.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin size={14} />
                            <span>{patient.location}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs">
                              <User size={12} className="text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">
                                Age: {patient.age} years
                              </span>
                            </div>
                            {patient.patientType && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-600 dark:text-slate-400 capitalize">
                                  Type: {patient.patientType}
                                </span>
                              </div>
                            )}
                            {patient.conditionType && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Activity size={12} className="text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400 capitalize">
                                  {patient.conditionType}
                                  {patient.gestationalWeeks && ` (${patient.gestationalWeeks} weeks)`}
                                </span>
                              </div>
                            )}
                            {patient.nextAppointment && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar size={12} className="text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">
                                  Next: {new Date(patient.nextAppointment).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-bold
                        ${getRiskColor(patient.riskStatus)}
                      `}>
                        {patient.riskStatus}
                      </span>
                      {patient.alerts && patient.alerts.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle size={12} />
                          <span>{patient.alerts.filter(a => !a.resolved).length} alerts</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-12">
              <User className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                No patients found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">
                Start typing to search
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Search by name, phone number, or location
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
