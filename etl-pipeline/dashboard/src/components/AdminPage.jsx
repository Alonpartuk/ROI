import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Flex,
  TextInput,
  Callout,
} from '@tremor/react';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OctupLogo from './OctupLogo';

// API_BASE includes '/api' in production, so we use paths like '/admin/users'
const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * AdminPage Component
 * User management for admin (alon@octup.com only)
 * Octup design language: White containers, #00CBC0 action buttons
 */
const AdminPage = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user } = useAuth();

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: {
          'X-User-Email': user?.email || '',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Add user handler
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user?.email || '',
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }

      setSuccess(`User ${newUserEmail} created successfully with default password: Octup2026!`);
      setShowAddModal(false);
      setNewUserEmail('');
      setNewUserName('');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingUser(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async (email) => {
    setDeletingUser(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'X-User-Email': user?.email || '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess(`User ${email} deleted successfully`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingUser(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <Card className="bg-white mb-6">
          <Flex justifyContent="between" alignItems="center">
            <div className="flex items-center gap-4">
              <OctupLogo variant="icon" size="md" />
              <div>
                <Title className="text-2xl text-[#809292]">User Management</Title>
                <Text className="text-gray-500">Manage dashboard access</Text>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00CBC0] hover:bg-[#00b3a9] text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              <PlusIcon className="h-5 w-5" />
              Add User
            </button>
          </Flex>
        </Card>

        {/* Success/Error Messages */}
        {success && (
          <Callout
            title="Success"
            icon={CheckCircleIcon}
            color="emerald"
            className="mb-6"
          >
            {success}
          </Callout>
        )}

        {error && (
          <Callout
            title="Error"
            icon={ExclamationTriangleIcon}
            color="rose"
            className="mb-6"
          >
            {error}
          </Callout>
        )}

        {/* Users Table */}
        <Card className="bg-white">
          <div className="flex items-center gap-2 mb-4">
            <UserGroupIcon className="h-5 w-5 text-[#809292]" />
            <Title className="text-lg">All Users</Title>
            <Badge color="gray">{users.length} total</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-[#00CBC0] border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell className="text-right">Status</TableHeaderCell>
                  <TableHeaderCell className="text-right">Password</TableHeaderCell>
                  <TableHeaderCell className="text-right">Last Login</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell>
                      <Flex justifyContent="start" className="space-x-2">
                        {u.isAdmin && (
                          <Badge color="amber" size="xs">Admin</Badge>
                        )}
                        <Text className="font-medium">{u.email}</Text>
                      </Flex>
                    </TableCell>
                    <TableCell>
                      <Text>{u.name || '-'}</Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge color={u.isActive ? 'emerald' : 'gray'}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.needsPasswordChange ? (
                        <Badge color="amber">Needs Change</Badge>
                      ) : (
                        <Badge color="emerald">Set</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className="text-gray-500 text-sm">
                        {formatDate(u.lastLoginAt)}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      {!u.isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm(u.email)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-white max-w-md w-full">
              <Flex justifyContent="between" alignItems="center" className="mb-6">
                <Title>Add New User</Title>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </Flex>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <TextInput
                    type="email"
                    placeholder="user@company.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (optional)
                  </label>
                  <TextInput
                    type="text"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <Callout
                  title="Default Password"
                  color="blue"
                  className="text-sm"
                >
                  New user will receive the default password: <strong>Octup2026!</strong>
                  <br />
                  They will be required to change it on first login.
                </Callout>

                <Flex justifyContent="end" className="space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser || !newUserEmail}
                    className="px-4 py-2 bg-[#00CBC0] hover:bg-[#00b3a9] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {addingUser ? 'Adding...' : 'Add User'}
                  </button>
                </Flex>
              </form>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-white max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-rose-600" />
                </div>
                <Title>Delete User?</Title>
                <Text className="mt-2">
                  Are you sure you want to delete <strong>{deleteConfirm}</strong>?
                  This action cannot be undone.
                </Text>
              </div>

              <Flex justifyContent="center" className="space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  disabled={deletingUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingUser ? 'Deleting...' : 'Delete User'}
                </button>
              </Flex>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
