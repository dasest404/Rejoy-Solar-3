import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { UserProfile, Lead, Customer, SolarProject, Quotation, ServiceTicket } from '../types/solar';

export const firestoreService = {
  /**
   * User Profile
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.id}`;
    try {
      await setDoc(doc(db, 'users', profile.id), {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        role: profile.role || 'Customer',
        phone: profile.phone || '',
        department: profile.department || '',
        designation: profile.designation || '',
        isFieldWorker: Boolean(profile.isFieldWorker)
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return null;
      return snap.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * CRM Leads
   */
  async saveLead(lead: Lead): Promise<void> {
    const path = `leads/${lead.id}`;
    try {
      await setDoc(doc(db, 'leads', lead.id), {
        id: lead.id,
        customerName: lead.customerName,
        phone: lead.phone,
        email: lead.email || '',
        city: lead.city || '',
        status: lead.status || 'NEW',
        solarCapacityKw: Number(lead.solarCapacityKw) || 0,
        estimatedValue: Number(lead.estimatedValue) || 0,
        notes: lead.notes || '',
        assignedSalespersonId: lead.assignedSalespersonId || '',
        createdBy: auth.currentUser?.uid || ''
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLeads(): Promise<Lead[]> {
    const path = 'leads';
    try {
      const snap = await getDocs(collection(db, 'leads'));
      return snap.docs.map(d => d.data() as Lead);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Customers
   */
  async saveCustomer(customer: Customer): Promise<void> {
    const path = `customers/${customer.id}`;
    try {
      await setDoc(doc(db, 'customers', customer.id), {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        status: customer.status || 'ACTIVE'
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getCustomers(): Promise<Customer[]> {
    const path = 'customers';
    try {
      const snap = await getDocs(collection(db, 'customers'));
      return snap.docs.map(d => d.data() as Customer);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Solar Projects
   */
  async saveProject(project: SolarProject): Promise<void> {
    const path = `projects/${project.id}`;
    try {
      await setDoc(doc(db, 'projects', project.id), {
        id: project.id,
        projectCode: project.projectCode,
        customerId: project.customerId,
        customerName: project.customerName || '',
        title: project.title,
        capacityKw: Number(project.capacityKw) || 0,
        totalValue: Number(project.totalValue) || 0,
        status: project.status || 'PLANNING'
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getProjects(): Promise<SolarProject[]> {
    const path = 'projects';
    try {
      const snap = await getDocs(collection(db, 'projects'));
      return snap.docs.map(d => d.data() as SolarProject);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Quotations
   */
  async saveQuotation(quote: Quotation): Promise<void> {
    const path = `quotations/${quote.id}`;
    try {
      await setDoc(doc(db, 'quotations', quote.id), {
        id: quote.id,
        quotationNumber: quote.quotationNumber,
        customerName: quote.customerName,
        capacityKw: Number(quote.capacityKw) || 0,
        grandTotal: Number(quote.totalAmount || quote.totalProjectCost) || 0,
        status: quote.status || 'DRAFT'
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Service Tickets
   */
  async saveServiceTicket(ticket: ServiceTicket): Promise<void> {
    const path = `serviceTickets/${ticket.id}`;
    try {
      await setDoc(doc(db, 'serviceTickets', ticket.id), {
        id: ticket.id,
        ticketNumber: ticket.ticketId || ticket.id,
        customerName: ticket.customerName,
        issue: ticket.issue,
        priority: ticket.priority,
        status: ticket.status
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
