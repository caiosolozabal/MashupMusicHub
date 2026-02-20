
'use client';

import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { TaskCategory, TaskPriority, TaskStatus } from "./types";

const OPEN_OWNER_STATUSES: TaskStatus[] = ["pending_acceptance", "pending", "doing"];
const OPEN_ASSIGNEE_STATUSES: TaskStatus[] = ["pending", "doing"];
const CLOSED_STATUSES: TaskStatus[] = ["completed", "declined", "canceled"];

export function getTasksCollection() {
  return collection(db, "tasks");
}

export function defaultDueDateEndOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function createTask(input: {
  title: string;
  description?: string;
  ownerUid: string;
  createdByUid: string;
  assignedToUids?: string[];
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: Date;
  linkedEventId?: string | null;
  notes?: string | null;
}) {
  const col = getTasksCollection();

  return addDoc(col, {
    ...input,
    dueDate: Timestamp.fromDate(input.dueDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const ref = doc(db, "tasks", taskId);

  const patch: any = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "completed") patch.completedAt = serverTimestamp();
  if (status !== "completed") patch.completedAt = null;

  return updateDoc(ref, patch);
}

export async function completeTaskMutation(taskId: string, input: {
  completionStatus: "completed" | "not_completed",
  completionNote?: string | null,
  completedByUid: string
}) {
  const ref = doc(db, "tasks", taskId);
  return updateDoc(ref, {
    status: "completed",
    completionStatus: input.completionStatus,
    completionNote: input.completionNote || null,
    completedByUid: input.completedByUid,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptTask(taskId: string) {
  return setTaskStatus(taskId, "pending");
}

export async function declineTask(taskId: string) {
  return setTaskStatus(taskId, "declined");
}

export async function cancelTask(taskId: string) {
  return setTaskStatus(taskId, "canceled");
}

export async function deleteTask(taskId: string) {
  const ref = doc(db, "tasks", taskId);
  return deleteDoc(ref);
}

export function queryMyOpenTasks(uid: string) {
  return query(
    getTasksCollection(),
    where("ownerUid", "==", uid),
    where("status", "in", OPEN_OWNER_STATUSES),
    orderBy("dueDate", "asc")
  );
}

export function queryMyAssignedOpenTasks(uid: string) {
  return query(
    getTasksCollection(),
    where("assignedToUids", "array-contains", uid),
    where("status", "in", OPEN_ASSIGNEE_STATUSES),
    orderBy("dueDate", "asc")
  );
}

export function queryMyClosedTasks(uid: string) {
  return query(
    getTasksCollection(),
    where("ownerUid", "==", uid),
    where("status", "in", CLOSED_STATUSES),
    orderBy("updatedAt", "desc")
  );
}
