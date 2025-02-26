import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student } from '../types';

type AttendanceContextType = {
  students: Student[];
  loading: boolean;
  addStudent: (student: Student) => void;
  removeStudent: (id: string) => void;
  clearAttendance: () => void;
};

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const STORAGE_KEY = 'attendance_data';

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsedData = JSON.parse(data);
          // Convert string dates back to Date objects
          const processedData = parsedData.map((student: any) => ({
            ...student,
            timestamp: new Date(student.timestamp)
          }));
          setStudents(processedData);
        }
      } catch (error) {
        console.error('Failed to load attendance data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to AsyncStorage whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(students));
      } catch (error) {
        console.error('Failed to save attendance data', error);
      }
    };

    if (students.length > 0) {
      saveData();
    }
  }, [students]);

  const addStudent = (student: Student) => {
    // Check if student already exists by ID
    const existingIndex = students.findIndex(s => s.id === student.id);
    
    if (existingIndex >= 0) {
      // Replace existing student
      const updatedStudents = [...students];
      updatedStudents[existingIndex] = student;
      setStudents(updatedStudents);
    } else {
      // Add new student
      setStudents(prevStudents => [student, ...prevStudents]);
    }
  };

  const removeStudent = (id: string) => {
    setStudents(prevStudents => prevStudents.filter(student => student.id !== id));
  };

  const clearAttendance = () => {
    setStudents([]);
    // Also clear from storage
    AsyncStorage.removeItem(STORAGE_KEY).catch(error => 
      console.error('Failed to clear attendance data', error)
    );
  };

  return (
    <AttendanceContext.Provider
      value={{
        students,
        loading,
        addStudent,
        removeStudent,
        clearAttendance
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};