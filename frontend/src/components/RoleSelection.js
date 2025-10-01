import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const roles = [
    {
      id: 'fullstack',
      title: 'Full Stack Developer',
      description: 'Frontend, Backend, Database, and API development'
    },
    {
      id: 'ai-ml',
      title: 'AI/ML Engineer',
      description: 'Machine Learning, Deep Learning, and Data Science'
    },
    {
      id: 'cloud',
      title: 'Cloud Engineer',
      description: 'AWS, Azure, GCP, DevOps, and Infrastructure'
    }
  ];

  const handleRoleSelect = (roleId) => {
    console.log('🎯 ROLE SELECTED:', {
      roleId,
      roleName: roles.find(r => r.id === roleId)?.title,
      timestamp: new Date().toISOString()
    });
    
    try {
      setIsNavigating(true);
      setError('');
      
      // Validate role
      const selectedRole = roles.find(r => r.id === roleId);
      if (!selectedRole) {
        throw new Error('Invalid role selected');
      }
      
      console.log('🧭 Navigating to interview page...');
      navigate(`/interview/${roleId}`);
      
    } catch (error) {
      console.error('❌ ROLE SELECTION ERROR:', {
        roleId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      setError('Failed to start interview. Please try selecting a role again.');
      setIsNavigating(false);
    }
  };

  return (
    <div className="role-selection">
      <h2>Select Your Interview Role</h2>
      <p>Choose the role you want to interview for:</p>
      
      {error && <div className="error">{error}</div>}
      
      {isNavigating && <div className="loading">Starting interview...</div>}
      
      <div className="role-cards">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`role-card ${isNavigating ? 'disabled' : ''}`}
            onClick={() => !isNavigating && handleRoleSelect(role.id)}
          >
            <h3>{role.title}</h3>
            <p>{role.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleSelection;