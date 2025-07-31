"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedAuthMiddleware = exports.requireSuperAdmin = exports.requireAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Middleware to check if user has admin privileges
const requireAdmin = (req, res, next) => {
    try {
        // Check if user is authenticated (assumes authMiddleware ran first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Check if user has admin role
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin privileges required'
            });
        }
        next();
    }
    catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireAdmin = requireAdmin;
// Middleware to check if user has super admin privileges
const requireSuperAdmin = (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Check if user has super admin role
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Super admin privileges required'
            });
        }
        next();
    }
    catch (error) {
        console.error('Super admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.requireSuperAdmin = requireSuperAdmin;
// Enhanced auth middleware that includes role information
const enhancedAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // In a real implementation, you'd fetch the user from the database
        // to get the current role information  
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        next();
    }
    catch (error) {
        console.error('Enhanced auth middleware error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};
exports.enhancedAuthMiddleware = enhancedAuthMiddleware;
exports.default = {
    requireAdmin: exports.requireAdmin,
    requireSuperAdmin: exports.requireSuperAdmin,
    enhancedAuthMiddleware: exports.enhancedAuthMiddleware
};
