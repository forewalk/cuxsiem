import { create } from 'zustand';
import { codeService } from '@/services/codeService';

const ROLE_KEY_MAP: Record<string, string> = {
  'role-1': 'admin',
  'role-2': 'monitoring',
  'role-3': 'approver',
  'role-4': 'user',
};

interface RoleCodesState {
  roleNames: Record<string, string>;
  roleCodes: { code: string; name: string }[];
  fetch: () => Promise<void>;
}

export const useRoleCodesStore = create<RoleCodesState>((set) => ({
  roleNames: {},
  roleCodes: [],
  fetch: async () => {
    try {
      const codes = await codeService.getRoleCodes();
      const map: Record<string, string> = {};
      const list: { code: string; name: string }[] = [];
      codes.forEach((c) => {
        const key = ROLE_KEY_MAP[c.id];
        if (key) {
          map[key] = c.code_name;
          list.push({ code: key, name: c.code_name });
        }
      });
      set({ roleNames: map, roleCodes: list });
    } catch {}
  },
}));
