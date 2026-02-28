import api from "./api";
import type { User, UserCreate, UserUpdate, UserListResponse } from "../types";

export const userService = {
  /**
   * 사용자 목록 조회
   */
  async getUsers(skip = 0, limit = 100): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>("/api/v1/users", {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * 사용자 상세 조회
   */
  async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/api/v1/users/${id}`);
    return response.data;
  },

  /**
   * 사용자 생성
   */
  async createUser(userData: UserCreate): Promise<User> {
    const response = await api.post<User>("/api/v1/users", userData);
    return response.data;
  },

  /**
   * 사용자 정보 수정
   */
  async updateUser(id: string, userData: UserUpdate): Promise<User> {
    const response = await api.put<User>(`/api/v1/users/${id}`, userData);
    return response.data;
  },

  /**
   * 사용자 삭제
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/v1/users/${id}`);
  },

  /**
   * 삭제된 사용자 목록 조회
   */
  async getDeletedUsers(skip = 0, limit = 100): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>("/api/v1/users/deleted", {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * 삭제된 사용자 복구
   */
  async restoreUser(id: string): Promise<void> {
    await api.post(`/api/v1/users/${id}/restore`);
  },

  /**
   * 사용자 완전 삭제
   */
  async permanentDeleteUser(id: string): Promise<void> {
    await api.delete(`/api/v1/users/${id}/permanent`);
  },
};
