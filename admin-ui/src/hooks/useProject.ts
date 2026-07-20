import { useStore } from '@/store';

export function useProject() {
  const currentProject = useStore(state => state.currentProject);
  const projects = useStore(state => state.projects);
  const setCurrentProject = useStore(state => state.setCurrentProject);
  const setProjects = useStore(state => state.setProjects);

  return {
    project: currentProject,
    projectId: currentProject?.id || '',
    projectName: currentProject?.name || '',
    projectDomain: currentProject?.domain || '',
    projects,
    setCurrentProject,
    setProjects,
    hasProject: !!currentProject,
  };
}