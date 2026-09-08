import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  VerifiedInstitution,
  VerifiedProgram,
  VerifiedDepartment,
} from '../../types';
import {
  Building2,
  GraduationCap,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Search,
  Sparkles,
} from 'lucide-react';

export interface AcademicHierarchyValue {
  institution: string;
  degree: string;
  academicField?: string;
  department: string;
  specialization?: string;
}

interface AcademicHierarchySelectorProps {
  value: AcademicHierarchyValue;
  onChange: (value: AcademicHierarchyValue) => void;
  required?: boolean;
  disabled?: boolean;
  showDegree?: boolean;
  showDepartment?: boolean;
  showSpecialization?: boolean;
}

export const AcademicHierarchySelector: React.FC<AcademicHierarchySelectorProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  showDegree = true,
  showDepartment = true,
  showSpecialization = true,
}) => {
  // Step 1: Institution Search State
  const [instQuery, setInstQuery] = useState(value.institution || '');
  const [instSuggestions, setInstSuggestions] = useState<VerifiedInstitution[]>([]);
  const [selectedInst, setSelectedInst] = useState<VerifiedInstitution | null>(null);
  const [isSearchingInst, setIsSearchingInst] = useState(false);
  const [isInstDropdownOpen, setIsInstDropdownOpen] = useState(false);
  const instContainerRef = useRef<HTMLDivElement>(null);

  // Step 2: Programs State
  const [programs, setPrograms] = useState<VerifiedProgram[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  // Step 3 & 4 & 5: Hierarchy (Field, Departments, Specializations)
  const [academicField, setAcademicField] = useState(value.academicField || '');
  const [departments, setDepartments] = useState<VerifiedDepartment[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);
  const [availableSpecializations, setAvailableSpecializations] = useState<string[]>([]);

  // Validation State
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync external value changes
  useEffect(() => {
    if (value.institution !== instQuery) {
      setInstQuery(value.institution || '');
    }
    if (value.academicField) {
      setAcademicField(value.academicField);
    }
  }, [value.institution, value.academicField]);

  // Handle clicking outside institution suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (instContainerRef.current && !instContainerRef.current.contains(e.target as Node)) {
        setIsInstDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Institution Search (500ms)
  useEffect(() => {
    if (!instQuery || instQuery.length < 2) {
      setInstSuggestions([]);
      setIsSearchingInst(false);
      return;
    }

    // Don't re-search if already selected
    if (selectedInst && selectedInst.name.toLowerCase() === instQuery.toLowerCase()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingInst(true);
      try {
        const res = await api.academic.searchInstitutions(instQuery);
        setInstSuggestions(res.data?.institutions || []);
      } catch {
        setInstSuggestions([]);
      } finally {
        setIsSearchingInst(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [instQuery, selectedInst]);

  // Load programs whenever verified institution is selected
  const handleSelectInstitution = async (inst: VerifiedInstitution) => {
    setSelectedInst(inst);
    setInstQuery(inst.name);
    setIsInstDropdownOpen(false);
    setValidationError(null);

    // Reset downstream dependent fields
    onChange({
      institution: inst.name,
      degree: '',
      academicField: '',
      department: '',
      specialization: '',
    });
    setAcademicField('');
    setDepartments([]);
    setAvailableSpecializations([]);

    // Fetch verified programs offered by this specific college
    if (showDegree) {
      setIsLoadingPrograms(true);
      try {
        const res = await api.academic.getPrograms(inst.name, inst.affiliatingUniversity || undefined);
        setPrograms(res.data?.programs || []);
      } catch {
        setPrograms([]);
        setValidationError('Unable to retrieve verified programs for this institution.');
      } finally {
        setIsLoadingPrograms(false);
      }
    }
  };

  // When Institution text is manually cleared or altered by user
  const handleInstInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInstQuery(val);
    setSelectedInst(null);
    setIsInstDropdownOpen(true);
    setPrograms([]);
    setDepartments([]);
    setAvailableSpecializations([]);
    setAcademicField('');
    setValidationError(null);

    onChange({
      institution: val,
      degree: '',
      academicField: '',
      department: '',
      specialization: '',
    });
  };

  // Step 2: Handle Degree selection -> auto-derive Academic Field & fetch physical Departments
  const handleSelectDegree = async (degreeName: string) => {
    const prog = programs.find((p) => p.name === degreeName);
    const derivedField = prog?.academicField || '';
    setAcademicField(derivedField);
    setValidationError(null);

    // Reset department & specialization
    onChange({
      ...value,
      degree: degreeName,
      academicField: derivedField,
      department: '',
      specialization: '',
    });
    setDepartments([]);
    setAvailableSpecializations([]);

    if (!degreeName || !value.institution) return;

    // Load physical departments & specializations at this institution
    setIsLoadingHierarchy(true);
    try {
      const res = await api.academic.getHierarchy(value.institution, degreeName);
      if (res.data && res.data.departments) {
        setDepartments(res.data.departments);
        if (res.data.academicField) {
          setAcademicField(res.data.academicField);
        }
      } else {
        setValidationError(
          'This degree could not be verified as being offered by the selected institution. Please select a valid college or degree/program.'
        );
      }
    } catch (err: any) {
      setValidationError(
        'This degree could not be verified as being offered by the selected institution. Please select a valid college or degree/program.'
      );
    } finally {
      setIsLoadingHierarchy(false);
    }
  };

  // Step 4: Handle Department selection -> load verified Specializations
  const handleSelectDepartment = (deptName: string) => {
    const dept = departments.find((d) => d.name === deptName);
    const specs = dept?.specializations || ['General'];
    setAvailableSpecializations(specs);

    const defaultSpec = specs.length === 1 ? specs[0] : (specs.includes('General') ? 'General' : specs[0] || '');

    onChange({
      ...value,
      department: deptName,
      specialization: defaultSpec,
    });
  };

  // Step 5: Handle Specialization selection
  const handleSelectSpecialization = (spec: string) => {
    onChange({
      ...value,
      specialization: spec,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. College / Institution (Dynamic UGC / AICTE Verified Auto-Complete) */}
      <div className="relative space-y-1.5" ref={instContainerRef}>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            College / Institution {required && <span className="text-red-500">*</span>}
          </label>
          {selectedInst && (
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{selectedInst.type}</span>
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Building2 className="w-4 h-4" />
          </div>

          <input
            type="text"
            required={required}
            disabled={disabled}
            value={instQuery}
            onChange={handleInstInputChange}
            onFocus={() => setIsInstDropdownOpen(true)}
            placeholder="Type institution name (e.g. IIT Delhi, DTU, National Institute of Ayurveda)..."
            autoComplete="off"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {isSearchingInst ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform cursor-pointer ${
                  isInstDropdownOpen ? 'rotate-180' : ''
                }`}
                onClick={() => setIsInstDropdownOpen(!isInstDropdownOpen)}
              />
            )}
          </div>
        </div>

        {/* Selected Institution Affiliation Subtitle */}
        {selectedInst?.affiliatingUniversity && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1 pl-1">
            <span>Affiliated to:</span>
            <span className="font-semibold text-slate-700">{selectedInst.affiliatingUniversity}</span>
          </p>
        )}

        {/* Institution Dropdown */}
        {isInstDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden p-1.5 space-y-1">
            {isSearchingInst && instSuggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Verifying institution recognition against UGC / AICTE records...</span>
              </div>
            ) : instSuggestions.length > 0 ? (
              instSuggestions.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => handleSelectInstitution(inst)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">
                        {inst.name}
                      </span>
                      {inst.shortName && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          {inst.shortName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {inst.city ? `${inst.city}, ` : ''}{inst.state} • {inst.accreditationStatus}
                    </p>
                    {inst.affiliatingUniversity && (
                      <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                        Affiliation: {inst.affiliatingUniversity}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold whitespace-nowrap">
                    UGC ✓
                  </span>
                </button>
              ))
            ) : instQuery.length >= 2 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No recognized higher education institutions found matching "{instQuery}".
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Type at least 2 characters to search recognized institutions.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Degree / Program & Academic Field */}
      {showDegree && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Degree / Program */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Degree / Program {required && <span className="text-red-500">*</span>}
              </label>
              {isLoadingPrograms && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span>Loading offerings...</span>
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <select
                disabled={disabled || !value.institution || isLoadingPrograms}
                value={value.degree}
                onChange={(e) => handleSelectDegree(e.target.value)}
                required={required}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!value.institution
                    ? 'Select institution first'
                    : isLoadingPrograms
                    ? 'Retrieving verified programs...'
                    : programs.length === 0
                    ? 'No verified programs found'
                    : 'Select verified degree/program'}
                </option>
                {programs.map((prog, idx) => (
                  <option key={idx} value={prog.name}>
                    {prog.name} — {prog.fullName} ({prog.level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Field (Auto-derived from verified program) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Academic Field (UGC Stream)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4" />
              </div>
              <input
                type="text"
                readOnly
                value={academicField || 'Auto-derived from verified degree'}
                placeholder="Auto-derived from verified degree"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Department & Specialization */}
      {(showDepartment || showSpecialization) && value.degree && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Department / Division */}
          {showDepartment && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Department / Division {required && <span className="text-red-500">*</span>}
                </label>
                {isLoadingHierarchy && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>Loading departments...</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  disabled={disabled || !value.degree || isLoadingHierarchy}
                  value={value.department}
                  onChange={(e) => handleSelectDepartment(e.target.value)}
                  required={required}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!value.degree
                      ? 'Select degree first'
                      : isLoadingHierarchy
                      ? 'Verifying physical departments...'
                      : departments.length === 0
                      ? 'No departments verified for this degree'
                      : 'Select verified department'}
                  </option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Specialization / Track */}
          {showSpecialization && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Specialization / Concentration Track
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <select
                  disabled={disabled || !value.department || availableSpecializations.length === 0}
                  value={value.specialization || ''}
                  onChange={(e) => handleSelectSpecialization(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!value.department
                      ? 'Select department first'
                      : availableSpecializations.length === 0
                      ? 'No specific specializations'
                      : 'Select specialization track'}
                  </option>
                  {availableSpecializations.map((spec, idx) => (
                    <option key={idx} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Warning / Rejection Alert */}
      {validationError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Academic Validation Notice</p>
            <p className="mt-0.5 text-amber-800">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
