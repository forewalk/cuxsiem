import { create } from 'zustand';
import { codeService } from '@/services/codeService';

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
        map[c.id] = c.code_name;
        list.push({ code: c.id, name: c.code_name });
      });
      set({ roleNames: map, roleCodes: list });
    } catch {}
  },
}));
