import React from 'react';
import { Dialog, DialogContent } from './ui/Dialog';
import { Button } from './ui/Button';
import { UserCheck, AlertCircle } from 'lucide-react';

interface UserLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserLoginDialog: React.FC<UserLoginDialogProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 bg-white rounded-2xl border shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Login Required</h2>
              <p className="text-red-100">Please use the main login screen</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Firebase Authentication Active
            </h3>
            <p className="text-gray-600">
              This system now uses Firebase authentication. Please use the main login screen 
              with your email and password to access the POS system.
            </p>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl"
          >
            <UserCheck className="h-5 w-5 mr-2" />
            Go to Login Screen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 