import PropertyCategory from '../models/PropertyCategory.js';
import mongoose from 'mongoose';

// Get all active categories (for public use)
export const getActiveCategories = async (req, res) => {
    try {
        const categories = await PropertyCategory.find({ isActive: true })
            .sort({ order: 1 })
            .select('-__v');

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await PropertyCategory.find()
            .sort({ order: 1 });

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Create category
export const createCategory = async (req, res) => {
    try {
        const { name, displayName, description, icon, color, badge } = req.body;

        // Auto-generate slug
        const slug = name.toLowerCase().replace(/\s+/g, '-');

        const category = new PropertyCategory({
            name,
            slug,
            displayName,
            description,
            icon,
            color,
            badge,
            isDynamic: true
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Admin: Update category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const category = await PropertyCategory.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Admin: Delete category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any properties use this category
        // Dynamic import to avoid circular dependency issues if any
        const Property = (await import('../models/Property.js')).default;
        const propertiesCount = await Property.countDocuments({ dynamicCategory: id });

        if (propertiesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete. ${propertiesCount} properties are using this category.`
            });
        }

        await PropertyCategory.findByIdAndDelete(id);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Reorder categories
export const reorderCategories = async (req, res) => {
    try {
        const { categories } = req.body; // Array of { id, order }

        const updates = categories.map(({ id, order }) =>
            PropertyCategory.findByIdAndUpdate(id, { order })
        );

        await Promise.all(updates);
        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
