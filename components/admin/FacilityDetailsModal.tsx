import React, { useState, useEffect } from 'react';
import { X, Users, Activity, MapPin, Phone, Calendar, AlertTriangle, Clock, User, FileText } from 'lucide-react';
import { Patient, Task, FacilityMetrics } from '../../types';
import { SuperadminService } from '../../services/backend/superadminService';

interface FacilityDetailsModalProps {
  isOpen: boolean;
  facility: FacilityMetrics | null;
  onClose: () => void;
}

export const FacilityDetailsModal: React.FC<FacilityDetailsModalProps> = ({
  isOpen,
  facility,
  onClose,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'patients' | 'tasks'>('patients');

  const service = new SuperadminService();

  useEffect(() => {
    if (isOpen && facility) {
      loadFacilityData();
    }
  }, [isOpen, facility]);

  const loadFacilityData = async () => {
    if (!facility) return;

    setLoading(true);
    try {
      const allPatients = await service.searchPatients('');
      const allTasks = await service.getAllTasks();

      // Filter patients by location (matching facility location)
      const facilityPatients = allPatients.filter(p =>
        p.location.toLowerCase().includes(facility.location.toLowerCase())
      );

      // Get patient IDs for this facility
      const facilityPatientIds = facilityPatients.map(p => p.id);

      // Filter tasks for patients in this facility
      const facilityTasks = allTasks.filter(t =>
        facilityPatientIds.includes(t.patientId) && !t.resolved
      );

      setPatients(facilityPatients);
      setTasks(facilityTasks);
    } catch (error) {
      console.error('Error loading facility data:', error);
      setPatients([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  if (!isOpen || !facility) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-6xl rounded-[2.5rem] shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {facility.name}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={14} />
                <span>{facility.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Users size={14} />
                <span>{facility.patientCount} patients</span>
              </div>
              {facility.type === 'clinic' && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Activity size={14} />
                  <span>{facility.activeTasks} active tasks</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-slate-100 dark:bg-[#2c2c2e] p-1 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'patients'
                ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={16} />
              <span>Patients ({patients.length})</span>
            </div>
          </button>
          {facility.type === 'clinic' && (
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity size={16} />
                <span>Tasks ({tasks.length})</span>
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-brand-600 mx-auto mb-4" style={{ width: 32, height: 32 }}>
                <Activity size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Loading facility data...</p>
            </div>
          ) : activeTab === 'patients' ? (
            <div className="space-y-3">
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all bg-white dark:bg-[#1c1c1e]"
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
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">
                            {patient.name}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Phone size={14} />
                              <span>{patient.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <MapPin size={14} />
                              <span>{patient.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Calendar size={14} />
                              <span>{patient.gestationalWeeks} weeks gestation</span>
                            </div>
                            {patient.nextAppointment && (
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Clock size={14} />
                                <span>Next: {new Date(patient.nextAppointment).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          {patient.medications && patient.medications.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                Medications ({patient.medications.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {patient.medications.slice(0, 3).map((med) => (
                                  <span
                                    key={med.id}
                                    className="px-2 py-1 bg-slate-100 dark:bg-[#2c2c2e] rounded-lg text-xs text-slate-700 dark:text-slate-300"
                                  >
                                    {med.name} ({med.dosage})
                                  </span>
                                ))}
                                {patient.medications.length > 3 && (
                                  <span className="px-2 py-1 bg-slate-100 dark:bg-[#2c2c2e] rounded-lg text-xs text-slate-500 dark:text-slate-400">
                                    +{patient.medications.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
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
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <User className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="text-slate-500 dark:text-slate-400 font-semibold">
                    No patients found for this facility
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Patients will appear here once enrolled
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all bg-white dark:bg-[#1c1c1e]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                          <Activity size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                            {task.patientName}
                          </h3>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold">
                              {task.type}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {task.deadline}
                            </span>
                          </div>
                          {task.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl">
                  <Activity className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="text-slate-500 dark:text-slate-400 font-semibold">
                    No active tasks for this facility
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    All tasks are resolved
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
