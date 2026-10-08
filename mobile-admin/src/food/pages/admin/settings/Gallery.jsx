/* Ported from Frontend/src/modules/Food/pages/admin/settings/Gallery.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Folder, Plus, ArrowLeft, HardDrive, Upload, File, Image, X, Search, MoreVertical, Download, Trash2 } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Input } from '../../../../components/shadcn';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { LinearGradient } from 'expo-linear-gradient';
import { pickDocument } from '../../../../lib/files';
import { alert } from '../../../../lib/webShim';
export default function Gallery() {
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // File system structure
  const [fileSystem, setFileSystem] = useState({
    Profile: {
      type: 'folder',
      items: [],
    },
    React_head: {
      type: 'folder',
      items: [],
    },
    About_us_i: {
      type: 'folder',
      items: [],
    },
    React_prom: {
      type: 'folder',
      items: [],
    },
    Reviewer_i: {
      type: 'folder',
      items: [],
    },
    React_gall: {
      type: 'folder',
      items: [],
    },
    React_down: {
      type: 'folder',
      items: [],
    },
    Product: {
      type: 'folder',
      items: [],
    },
    Payment_mo: {
      type: 'folder',
      items: [],
    },
    Advertisem: {
      type: 'folder',
      items: [],
    },
    React_land: {
      type: 'folder',
      items: [],
    },
    Header_ima: {
      type: 'folder',
      items: [],
    },
    'Delivery-M': {
      type: 'folder',
      items: [],
    },
    Vendor: {
      type: 'folder',
      items: [],
    },
    Cuisine: {
      type: 'folder',
      items: [],
    },
    Opportunit: {
      type: 'folder',
      items: [],
    },
    Admin: {
      type: 'folder',
      items: [],
    },
    Landing: {
      type: 'folder',
      items: [],
    },
    React_rest: {
      type: 'folder',
      items: [],
    },
    Restaurant: {
      type: 'folder',
      items: [],
    },
    Page_meta_: {
      type: 'folder',
      items: [],
    },
    Campaign: {
      type: 'folder',
      items: [],
    },
    React_serv: {
      type: 'folder',
      items: [],
    },
    Category: {
      type: 'folder',
      items: [],
    },
    Hero_image: {
      type: 'folder',
      items: [],
    },
    Conversati: {
      type: 'folder',
      items: [],
    },
    Meta_image: {
      type: 'folder',
      items: [],
    },
    Business: {
      type: 'folder',
      items: [],
    },
    Notificati: {
      type: 'folder',
      items: [],
    },
    Meta_data_: {
      type: 'folder',
      items: [],
    },
    React_deli: {
      type: 'folder',
      items: [],
    },
    Why_choose: {
      type: 'folder',
      items: [],
    },
    Email_temp: {
      type: 'folder',
      items: [],
    },
    Banner: {
      type: 'folder',
      items: [],
    },
    Available_: {
      type: 'folder',
      items: [],
    },
    React_step: {
      type: 'folder',
      items: [],
    },
    Feature_im: {
      type: 'folder',
      items: [],
    },
    Step_image: {
      type: 'folder',
      items: [],
    },
    Earn_money: {
      type: 'folder',
      items: [],
    },
    React_meta: {
      type: 'folder',
      items: [],
    },
  });
  const folders = Object.keys(fileSystem);
  const filteredFolders = folders.filter((folder) => folder.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleFolderClick = (folderName) => {
    setCurrentPath(folderName);
  };
  const handleBack = () => {
    setCurrentPath('');
  };
  const handleFileSelect = async () => {
    const files = await pickDocument({ multiple: true });
    if (!files.length) return;
    setSelectedFiles(files);
    setIsUploadDialogOpen(true);
  };
  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    const targetFolder = currentPath || 'root';
    const newFiles = selectedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));
    setFileSystem((prev) => ({
      ...prev,
      [targetFolder]: {
        ...prev[targetFolder],
        items: [...(prev[targetFolder]?.items || []), ...newFiles],
      },
    }));
    alert(`${selectedFiles.length} file(s) uploaded successfully!`);
    setSelectedFiles([]);
    setIsUploadDialogOpen(false);
  };
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }
    const folderName = newFolderName.trim();
    if (fileSystem[folderName]) {
      alert('Folder already exists');
      return;
    }
    setFileSystem((prev) => ({
      ...prev,
      [folderName]: {
        type: 'folder',
        items: [],
      },
    }));
    setNewFolderName('');
    setIsFolderDialogOpen(false);
    alert(`Folder "${folderName}" created successfully!`);
  };
  const handleDeleteFolder = async (folderName) => {
    if (await window.confirmAsync(`Are you sure you want to delete "${folderName}"?`)) {
      setFileSystem((prev) => {
        const newSystem = {
          ...prev,
        };
        delete newSystem[folderName];
        return newSystem;
      });
      if (currentPath === folderName) {
        setCurrentPath('');
      }
    }
  };
  const currentFolderItems = currentPath ? fileSystem[currentPath]?.items || [] : [];
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <LinearGradient colors={['#FACC15', '#CA8A04']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <UiIcon as={Folder} className="w-5 h-5 text-white" />
            </LinearGradient>
            <H1 className="text-2xl font-bold text-slate-900">File Manager</H1>
          </Div>
        </Div>

        {/* Main Content */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          {/* Top Bar */}
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Div className="flex flex-wrap items-center gap-4">
              <Button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-2">
                <UiIcon as={HardDrive} className="w-4 h-4" />
                Local storage
              </Button>
              <Div className="flex items-center gap-2">
                <Span className="text-sm text-slate-700">Public</Span>
                <Span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">{folders.length}</Span>
              </Div>
              {currentPath && (
                <Div className="flex items-center gap-2 text-sm text-slate-600">
                  <Span>/</Span>
                  <Span className="font-medium">{currentPath}</Span>
                </Div>
              )}
            </Div>

            <Div className="flex flex-wrap items-center gap-2">
              {currentPath && (
                <Button
                  onClick={handleBack}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <UiIcon as={ArrowLeft} className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button
                onClick={() => setIsFolderDialogOpen(true)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <UiIcon as={Folder} className="w-4 h-4" />
                New Folder
              </Button>
              <Button
                onClick={handleFileSelect}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <UiIcon as={Plus} className="w-4 h-4" />
                Add New
              </Button>
            </Div>
          </Div>

          {/* Search Bar */}
          <Div className="mb-6">
            <Div className="relative">
              <UiIcon as={Search} className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border-slate-300 rounded-lg"
              />
            </Div>
          </Div>

          {/* Folder/File Grid */}
          {currentPath ? (
            <Div>
              <Div className="mb-4">
                <H3 className="text-sm font-semibold text-slate-700">Files in {currentPath}</H3>
              </Div>
              {currentFolderItems.length === 0 ? (
                <Div className="text-center py-12 text-slate-500">
                  <UiIcon as={File} className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <P className="text-sm">No files in this folder</P>
                </Div>
              ) : (
                <Div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {currentFolderItems.map((file, index) => (
                    <Div key={index} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity group relative">
                      <Div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        {file.type?.startsWith('image/') ? (
                          <UiIcon as={Image} className="w-8 h-8 text-blue-600" />
                        ) : (
                          <UiIcon as={File} className="w-8 h-8 text-blue-600" />
                        )}
                      </Div>
                      <Span className="text-xs text-slate-700 text-center max-w-full truncate">{file.name}</Span>
                      <Div className="absolute top-0 right-0">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle file delete
                          }}
                          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <UiIcon as={X} className="w-3 h-3" />
                        </Button>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>
          ) : (
            <Div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {filteredFolders.map((folder, index) => (
                <Div
                  key={index}
                  className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity group relative"
                  onClick={() => handleFolderClick(folder)}
                >
                  <Div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                    <UiIcon as={Folder} className="w-8 h-8 text-yellow-600" />
                  </Div>
                  <Span className="text-xs text-slate-700 text-center max-w-full truncate">{folder}</Span>
                  <Div className="absolute top-0 right-0">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder);
                      }}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <UiIcon as={Trash2} className="w-3 h-3" />
                    </Button>
                  </Div>
                </Div>
              ))}
            </Div>
          )}
        </Div>
      </Div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <Div className="space-y-4">
            <Div>
              <P className="text-sm text-slate-600 mb-2">{selectedFiles.length} file(s) selected:</P>
              <ScrollDiv className="max-h-40 space-y-1">
                {selectedFiles.map((file, index) => (
                  <Div key={index} className="text-xs text-slate-700 bg-slate-50 p-2 rounded">
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </Div>
                ))}
              </ScrollDiv>
            </Div>
            <Div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFiles([]);
                }}
                className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                Upload
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Div className="space-y-4">
            <Input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
              className="w-full"
            />
            <Div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsFolderDialogOpen(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                Create
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
