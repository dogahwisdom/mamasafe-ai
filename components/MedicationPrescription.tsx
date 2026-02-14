import React, { useState, useEffect } from 'react';
import { Pill, Plus, X, Clock, Trash2, Edit2, Check, AlertCircle, Calendar } from 'lucide-react';
import { Medication, Patient } from '../types';
import { backend } from '../services/backend';

interface MedicationPrescriptionProps {
  patient: Patient;
  onUpdate: () => Promise<void>;
}

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning', time: '08:00 AM', color: 'bg-amber-500' },
  { value: 'afternoon', label: 'Afternoon', time: '02:00 PM', color: 'bg-blue-500' },
  { value: 'evening', label: 'Evening', time: '07:00 PM', color: 'bg-indigo-500' },
];

const COMMON_MEDICATIONS = [
  { name: 'Ferrous Sulfate', dosage: '200mg', frequency: 'Once daily' },
  { name: 'Folic Acid', dosage: '5mg', frequency: 'Once daily' },
  { name: 'Calcium Carbonate', dosage: '1000mg', frequency: 'Twice daily' },
  { name: 'Multivitamin', dosage: '1 tablet', frequency: 'Once daily' },
  { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily' },
];

export const MedicationPrescription: React.FC<MedicationPrescriptionProps> = ({ patient, onUpdate }) => {
  const [medications, setMedications] = useState<Medication[]>(patient.medications || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    time: '08:00 AM',
    type: 'morning' as 'morning' | 'afternoon' | 'evening',
    instructions: '',
  });

  useEffect(() => {
    setMedications(patient.medications || []);
  }, [patient]);

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'Once daily',
      time: '08:00 AM',
      type: 'morning',
      instructions: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      return;
    }

    setLoading(true);
    try {
      const medicationData: Medication = editingId
        ? {
            id: editingId,
            name: formData.name.trim(),
            dosage: formData.dosage.trim(),
            frequency: formData.frequency,
            time: formData.time,
            type: formData.type,
            instructions: formData.instructions.trim(),
            adherenceRate: medications.find(m => m.id === editingId)?.adherenceRate || 0,
            taken: medications.find(m => m.id === editingId)?.taken || false,
          }
        : {
            id: Date.now().toString(),
            name: formData.name.trim(),
            dosage: formData.dosage.trim(),
            frequency: formData.frequency,
            time: formData.time,
            type: formData.type,
            instructions: formData.instructions.trim(),
            adherenceRate: 0,
            taken: false,
          };

      const updatedMedications = editingId
        ? medications.map(m => m.id === editingId ? medicationData : m)
        : [...medications, medicationData];

      // Update patient with new medications
      const updatedPatient: Patient = {
        ...patient,
        medications: updatedMedications,
      };

      await backend.patients.add(updatedPatient);
      setMedications(updatedMedications);
      resetForm();
      await onUpdate();
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Failed to save medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this medication?')) return;

    setLoading(true);
    try {
      const updatedMedications = medications.filter(m => m.id !== id);
      const updatedPatient: Patient = {
        ...patient,
        medications: updatedMedications,
      };

      await backend.patients.add(updatedPatient);
      setMedications(updatedMedications);
      await onUpdate();
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to remove medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (med: Medication) => {
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      time: med.time,
      type: med.type,
      instructions: med.instructions || '',
    });
    setEditingId(med.id);
    setIsAdding(true);
  };

  const handleQuickAdd = (med: typeof COMMON_MEDICATIONS[0]) => {
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      time: '08:00 AM',
      type: 'morning',
      instructions: '',
    });
    setIsAdding(true);
  };

  const getTimeSlotColor = (type: string) => {
    const slot = TIME_OPTIONS.find(t => t.value === type);
    return slot?.color || 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="text-brand-500" size={24} />
            Medications
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {medications.length} active prescription{medications.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full font-semibold text-sm shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Add Medication
          </button>
        )}
      </div>

      {/* Quick Add Common Medications */}
      {!isAdding && medications.length === 0 && (
        <div className="bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_MEDICATIONS.map((med, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAdd(med)}
                className="px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95"
              >
                {med.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-gradient-to-br from-brand-50 to-teal-50 dark:from-brand-900/10 dark:to-teal-900/10 rounded-2xl p-6 border border-brand-200 dark:border-brand-800 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-900 dark:text-white">
              {editingId ? 'Edit Medication' : 'New Medication'}
            </h4>
            <button
              onClick={resetForm}
              className="p-1.5 hover:bg-white/50 dark:hover:bg-black/20 rounded-full transition-colors"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Medication Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Medication Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ferrous Sulfate"
                className="w-full px-4 py-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                autoFocus
              />
            </div>

            {/* Dosage & Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Dosage
                </label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 200mg"
                  className="w-full px-4 py-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                >
                  <option>Once daily</option>
                  <option>Twice daily</option>
                  <option>Three times daily</option>
                  <option>As needed</option>
                </select>
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Time of Day
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: option.value as 'morning' | 'afternoon' | 'evening',
                        time: option.time,
                      });
                    }}
                    className={`
                      px-4 py-3 rounded-xl font-semibold text-sm transition-all
                      ${formData.type === option.value
                        ? `${option.color} text-white shadow-lg scale-105`
                        : 'bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock size={16} />
                      <span className="text-xs font-bold">{option.label}</span>
                      <span className="text-xs opacity-80">{option.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Instructions (Optional)
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="e.g., Take with food, Avoid dairy products"
                rows={2}
                className="w-full px-4 py-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.dosage.trim() || loading}
                className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-400 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all disabled:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editingId ? 'Update' : 'Add Medication'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medications List */}
      {medications.length > 0 && (
        <div className="space-y-3">
          {TIME_OPTIONS.map((timeSlot) => {
            const slotMeds = medications.filter(m => m.type === timeSlot.value);
            if (slotMeds.length === 0) return null;

            return (
              <div key={timeSlot.value} className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Time Slot Header */}
                <div className={`${getTimeSlotColor(timeSlot.value)} text-white px-5 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span className="font-bold text-sm">{timeSlot.label}</span>
                    <span className="text-xs opacity-90">{timeSlot.time}</span>
                  </div>
                  <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    {slotMeds.length}
                  </span>
                </div>

                {/* Medications in this slot */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {slotMeds.map((med, idx) => (
                    <div
                      key={med.id}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 dark:text-white">{med.name}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold">
                              {med.dosage}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{med.frequency}</p>
                          {med.instructions && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">{med.instructions}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{med.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(med)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} className="text-slate-600 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isAdding && medications.length === 0 && (
        <div className="bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill size={24} className="text-slate-400" />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">No Medications Prescribed</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Add medications to help track patient adherence and send automated reminders.
          </p>
        </div>
      )}
    </div>
  );
};
