import { useQuery } from '@tanstack/react-query';
import { getGroups, getGroupMembers } from '../services/arcgis';

export function useGroups(token, orgId) {
  return useQuery({
    queryKey: ['groups', orgId],
    queryFn: async () => {
      const data = await getGroups(token, orgId);
      return data.results || [];
    },
    enabled: !!token && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGroupMembers(token, groupId) {
  return useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      const data = await getGroupMembers(token, groupId);
      return {
        admins: data.admins || [],
        users: data.users || [],
        owner: data.owner,
      };
    },
    enabled: !!token && !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}
