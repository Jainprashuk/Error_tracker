import React from 'react';
import { useAuthStore } from '../store/auth';
import { ChevronDown, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui';
import { CreateOrgModal } from './CreateOrgModal';

export const OrgSwitcher: React.FC = () => {
  const { organizations, currentOrgId, setCurrentOrgId } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const orgsList = Array.isArray(organizations) ? organizations : [];

  // Auto select first organization
  React.useEffect(() => {
    if (!currentOrgId && orgsList.length > 0) {
      setCurrentOrgId(orgsList[0]._id);
    }
  }, [currentOrgId, orgsList, setCurrentOrgId]);

  const currentOrg = orgsList.find(o => o._id === currentOrgId);

  return (
    <div className="px-4 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all group">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium text-slate-200 truncate w-full">
                {currentOrg?.name || 'Select Organization'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {currentOrg?.my_role || 'Member'}
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 bg-slate-900 border-slate-800 text-slate-300">
          <DropdownMenuLabel className="text-slate-500">
            Organizations
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-800" />

          {orgsList.map((org) => (
            <DropdownMenuItem
              key={org._id}
              onClick={() => setCurrentOrgId(org._id)}
              className={`flex flex-col items-start gap-1 py-2 px-3 focus:bg-slate-800 focus:text-slate-200 cursor-pointer ${org._id === currentOrgId
                ? 'bg-slate-800/50 text-indigo-400'
                : ''
                }`}
            >
              <div className="font-medium">{org.name}</div>
              <div className="text-[10px] text-slate-500 uppercase">
                {org.my_role}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-slate-800" />

          <DropdownMenuItem
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10 cursor-pointer"
          >
            + Create New Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};