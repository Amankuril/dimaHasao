/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminHotelDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  ChevronLeft,
  Bed,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Search,
  Ban,
  Phone,
  Loader2,
  Clock,
  Image as ImageIcon,
  Users,
} from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import RoomRatesManager from '../components/RoomRatesManager';
import { toast } from '../../../../lib/notify';

// --- Tab Components ---
import {
  A,
  Br,
  Button,
  Div,
  H1,
  H2,
  H3,
  H4,
  H5,
  HScroll,
  Img,
  Input,
  Link,
  P,
  ScrollDiv,
  Span,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
const OverviewTab = ({ hotel }) => (
  <Div className="space-y-6">
    <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <H3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <UiIcon as={Building2} size={14} /> Property Information
        </H3>
        <Div className="space-y-3 text-sm">
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Property Name</Span>
            <Span className="font-bold text-gray-900">{hotel.propertyName}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</Span>
            <Span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Contact Number</Span>
            <Span className="font-bold text-gray-900">{hotel.contactNumber || 'Not Provided'}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Status</Span>
            <Span className="font-bold text-gray-900 capitalize">{hotel.status}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Joined Date</Span>
            <Span className="font-bold text-gray-900">{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Total Room Types</Span>
            <Span className="font-bold text-gray-900">{hotel.rooms?.length || 0}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Live On Platform</Span>
            <Span className="font-bold text-gray-900 flex items-center gap-1">
              {hotel.isLive ? <UiIcon as={CheckCircle} size={12} className="text-green-600" /> : <UiIcon as={XCircle} size={12} className="text-red-500" />}
              {hotel.isLive ? 'Yes' : 'No'}
            </Span>
          </Div>
        </Div>
      </Div>
      <Div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <H3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <UiIcon as={MapPin} size={14} /> Partner & Location
        </H3>
        <Div className="space-y-3 text-sm">
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Partner Name</Span>
            <Span className="font-bold text-gray-900">{hotel.partnerId?.name || 'N/A'}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Partner Email</Span>
            <Span className="font-bold text-gray-900">{hotel.partnerId?.email || 'N/A'}</Span>
          </Div>
          <Div className="flex justify-between">
            <Span className="text-gray-500 font-bold uppercase text-[10px]">Partner Phone</Span>
            <Span className="font-bold text-gray-900">{hotel.partnerId?.phone || 'N/A'}</Span>
          </Div>
          <Div className="pt-2">
            <Span className="text-gray-500 font-bold uppercase text-[10px] block mb-1">Full Address</Span>
            <Span className="font-bold block text-gray-800 leading-relaxed">
              {hotel.address?.fullAddress || hotel.address?.area || 'N/A'}
              <Br />
              {hotel.address?.city}, {hotel.address?.district ? `${hotel.address.district}, ` : ''}
              {hotel.address?.state} {hotel.address?.pincode && `- ${hotel.address.pincode}`}
            </Span>
          </Div>
        </Div>
      </Div>
    </Div>

    <Div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <H3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">About Property</H3>
      {hotel.shortDescription && (
        <Div className="mb-4">
          <H4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Short Description</H4>
          <P className="text-sm font-bold text-gray-700 uppercase tracking-tight italic">{hotel.shortDescription}</P>
        </Div>
      )}
      <H4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Detailed Description</H4>
      <P className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
        {hotel.description || 'No description provided for this property.'}
      </P>
    </Div>

    <Div>
      <H3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Amenities</H3>
      <Div className="flex flex-wrap gap-3">
        {hotel.amenities && hotel.amenities.length > 0 ? (
          hotel.amenities.map((amenity, i) => (
            <Div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700">
              <UiIcon as={CheckCircle} size={12} className="text-green-500" />
              {amenity.replace(/_/g, ' ')}
            </Div>
          ))
        ) : (
          <P className="text-xs text-gray-400 font-bold uppercase">No amenities listed</P>
        )}
      </Div>
    </Div>

    {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 && (
      <Div>
        <H3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Nearby Places</H3>
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotel.nearbyPlaces.map((place, i) => (
            <Div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <Div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UiIcon as={MapPin} size={14} />
              </Div>
              <Div>
                <H4 className="text-sm font-bold text-gray-900">{place.name}</H4>
                <P className="text-[10px] font-bold uppercase text-gray-500">
                  {place.type} • <Span className="text-emerald-600">{place.distanceKm} KM</Span>
                </P>
              </Div>
            </Div>
          ))}
        </Div>
      </Div>
    )}
  </Div>
);
const GalleryTab = ({ hotel }) => (
  <Div className="space-y-10">
    {/* Section: Property Wide Images */}
    <Div>
      <Div className="flex items-center gap-2 mb-4">
        <UiIcon as={Building2} size={20} className="text-blue-600" />
        <H3 className="text-lg font-bold text-gray-900 uppercase">General Property Photos</H3>
      </Div>
      <Div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {hotel.propertyImages && hotel.propertyImages.length > 0 ? (
          hotel.propertyImages.map((img, i) => (
            <Div
              key={i}
              className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative group shadow-sm transition-all hover:shadow-md"
            >
              <Img src={img.url || img} alt={`Property ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </Div>
          ))
        ) : (
          <Div className="col-span-full py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <P className="text-gray-400 font-bold uppercase text-xs">No General Photos</P>
          </Div>
        )}
      </Div>
    </Div>
  </Div>
);
const DocumentsTab = ({ hotel, documents, onVerify, verifying }) => {
  const [remark, setRemark] = useState('');
  if (!documents) {
    return (
      <Div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
        <UiIcon as={ShieldCheck} size={48} className="mx-auto text-gray-200 mb-4" />
        <H3 className="text-gray-900 font-bold uppercase text-sm">No Documents Submitted</H3>
        <P className="text-gray-400 text-xs mt-1">This property has not uploaded any verification documents yet.</P>
      </Div>
    );
  }
  const status = documents.verificationStatus || 'pending';
  return (
    <Div className="space-y-6">
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <H4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
            <UiIcon as={FileText} size={16} /> Document Summary
          </H4>
          <Div className="space-y-4 text-sm">
            <Div className="flex justify-between">
              <Span className="text-gray-500 font-bold uppercase text-[10px]">Property</Span>
              <Span className="font-bold text-gray-900">{hotel.propertyName}</Span>
            </Div>
            <Div className="flex justify-between">
              <Span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</Span>
              <Span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</Span>
            </Div>
            <Div className="flex justify-between items-center">
              <Span className="text-gray-500 font-bold uppercase text-[10px]">Verification Status</Span>
              <Span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${status === 'verified' ? 'bg-green-100 text-green-700 border border-green-200' : status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
              >
                {status === 'verified' && <UiIcon as={ShieldCheck} size={10} />}
                {status === 'rejected' && <UiIcon as={XCircle} size={10} />}
                {status === 'pending' && <UiIcon as={Clock} size={10} />}
                {status}
              </Span>
            </Div>
            {documents.verifiedAt && (
              <Div className="flex justify-between">
                <Span className="text-gray-500 font-bold uppercase text-[10px]">Last Updated</Span>
                <Span className="font-bold text-gray-900">{new Date(documents.verifiedAt).toLocaleString()}</Span>
              </Div>
            )}
            {documents.adminRemark && (
              <Div>
                <P className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Remark</P>
                <P className="text-xs font-bold text-gray-800">{documents.adminRemark}</P>
              </Div>
            )}
          </Div>
        </Div>

        <Div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <H4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
            <UiIcon as={ShieldCheck} size={16} /> Verification Actions
          </H4>
          <Div className="space-y-4">
            <Div>
              <P className="text-[10px] text-gray-500 uppercase font-bold mb-2">Rejection Remark</P>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note in case of rejection"
                className="w-full min-h-[80px] text-xs font-bold uppercase border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </Div>
            <Div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                disabled={verifying || status === 'verified'}
                onClick={() => onVerify && onVerify('approve', '')}
                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'verified' ? 'bg-green-100 text-green-500 border border-green-100 cursor-not-allowed' : 'bg-green-600 text-white border border-green-600 hover:bg-green-700'} ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <UiIcon as={CheckCircle} size={14} />
                Approve Documents
              </Button>
              <Button
                type="button"
                disabled={verifying || status === 'rejected'}
                onClick={() => onVerify && onVerify('reject', remark)}
                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'rejected' ? 'bg-red-100 text-red-500 border border-red-100 cursor-not-allowed' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'} ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <UiIcon as={XCircle} size={14} />
                Reject Documents
              </Button>
            </Div>
            <P className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
              Approving documents will move the property to <Span className="text-green-700">approved</Span> status and make it live on the platform. Rejected
              properties will stay hidden from users until issues are fixed.
            </P>
          </Div>
        </Div>
      </Div>

      <Div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <H4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
          <UiIcon as={FileText} size={16} /> Uploaded Documents
        </H4>
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.documents && documents.documents.length > 0 ? (
            documents.documents.map((doc, idx) => (
              <Div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between bg-gray-50">
                <Div className="space-y-2">
                  <Div className="flex items-center justify-between gap-2">
                    <Span className="text-xs font-bold text-gray-900 uppercase">{doc.name || doc.type || 'Document'}</Span>
                    {doc.isRequired && (
                      <Span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                        Required
                      </Span>
                    )}
                  </Div>
                  <P className="text-[10px] text-gray-400 uppercase">{doc.type || 'Uploaded File'}</P>
                </Div>
                <Div className="mt-3">
                  {doc.fileUrl ? (
                    <A
                      href={doc.fileUrl}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100"
                    >
                      <UiIcon as={FileText} size={12} />
                      View File
                    </A>
                  ) : (
                    <Span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                      <UiIcon as={AlertCircle} size={11} /> No file
                    </Span>
                  )}
                </Div>
              </Div>
            ))
          ) : (
            <Div className="col-span-full text-center py-8 text-[10px] font-bold uppercase text-gray-400">No individual documents uploaded</Div>
          )}
        </Div>
      </Div>
    </Div>
  );
};
const RoomsTab = ({ rooms }) => {
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  return (
    <Div className="space-y-6">
      <Div className="flex justify-between items-center">
        <H3 className="text-lg font-bold text-gray-900 uppercase">Room Inventory</H3>
      </Div>

      <Div className="space-y-4">
        {rooms && rooms.length > 0 ? (
          rooms.map((room, i) => {
            const isExpanded = expandedRoomId === room._id;
            return (
              <Div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <Div
                  className="p-5 flex flex-col md:flex-row items-center gap-6 cursor-pointer"
                  onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}
                >
                  <Div className="w-full md:w-32 h-24 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-400 relative overflow-hidden">
                    {room.images && room.images[0] ? (
                      <Img src={room.images[0].url || room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                    ) : (
                      <UiIcon as={Bed} size={32} />
                    )}
                  </Div>
                  <Div className="flex-1 w-full text-center md:text-left">
                    <H4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{room.name}</H4>
                    <Div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-bold uppercase text-gray-400">
                      <Span className="flex items-center gap-1">
                        <UiIcon as={Users} size={12} /> Max {room.maxAdults} Adults, {room.maxChildren} Child
                      </Span>
                      <Span className="flex items-center gap-1">
                        <UiIcon as={Building2} size={12} /> {room.totalInventory} Rooms Total
                      </Span>
                      <Span className="flex items-center gap-1 text-green-600">
                        <UiIcon as={ShieldCheck} size={12} /> {room.inventoryType}
                      </Span>
                    </Div>
                  </Div>
                  <Div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                    <Div className="text-center">
                      <P className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</P>
                      <Span
                        className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {room.isActive ? 'Active' : 'Inactive'}
                      </Span>
                    </Div>
                    <Div className="text-right">
                      <P className="text-[10px] text-gray-400 uppercase font-bold mb-1">Price / Night</P>
                      <P className="text-xl font-bold text-gray-900">₹{room.pricePerNight}</P>
                    </Div>
                    <UiIcon
                      as={ChevronLeft}
                      size={20}
                      className={`text-gray-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`}
                    />
                  </Div>
                </Div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: 'auto',
                        opacity: 1,
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.3,
                      }}
                      className="border-t border-gray-100 bg-gray-50"
                    >
                      <Div className="p-6">
                        {/* Details Grid */}
                        <Div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <Div>
                            <H5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Pricing Details</H5>
                            <Div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Base Price</Span>
                                <Span className="font-bold text-gray-900">₹{room.pricePerNight}</Span>
                              </Div>
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Extra Adult</Span>
                                <Span className="font-bold text-gray-900">₹{room.extraAdultPrice}</Span>
                              </Div>
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Extra Child</Span>
                                <Span className="font-bold text-gray-900">₹{room.extraChildPrice}</Span>
                              </Div>
                            </Div>
                          </Div>
                          <Div>
                            <H5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Configuration</H5>
                            <Div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Category</Span>
                                <Span className="font-bold text-gray-900 uppercase">{room.roomCategory}</Span>
                              </Div>
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Inventory Type</Span>
                                <Span className="font-bold text-gray-900 uppercase">{room.inventoryType}</Span>
                              </Div>
                              <Div className="flex justify-between text-xs">
                                <Span className="text-gray-500 font-medium">Total Inventory</Span>
                                <Span className="font-bold text-gray-900">{room.totalInventory} Units</Span>
                              </Div>
                            </Div>
                          </Div>
                          <Div>
                            <H5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Amenities</H5>
                            <Div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-2">
                              {room.amenities.map((amenity, idx) => (
                                <Span key={idx} className="px-2 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                  {amenity}
                                </Span>
                              ))}
                            </Div>
                          </Div>
                        </Div>

                        {/* Room Images */}
                        <Div>
                          <H5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Room Photos</H5>
                          <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {room.images &&
                              room.images.map((img, idx) => (
                                <Div key={idx} className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-200 group relative">
                                  <Img
                                    src={img.url || img}
                                    alt={`${room.name} ${idx}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                </Div>
                              ))}
                          </Div>
                        </Div>
                      </Div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Div>
            );
          })
        ) : (
          <Div className="py-10 text-center text-gray-400 font-bold uppercase text-xs">No room data available</Div>
        )}
      </Div>
    </Div>
  );
};
const BookingsTab = ({ bookings, propertyType }) => (
  <Div className="space-y-4">
    <Div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <Div className="relative w-full md:w-80">
        <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search Guest Name..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-black"
        />
      </Div>
      <Div className="flex items-center gap-4">
        <Div className="text-[10px] font-bold uppercase text-gray-500">
          Total: <Span className="font-bold text-gray-900">{bookings?.length || 0} Bookings</Span>
        </Div>
      </Div>
    </Div>

    <Div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <Table cols={[130, 130, 120]} className="w-full text-left text-sm">
        <Thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
          <Tr>
            <Th className="p-4 font-bold text-gray-600">Booking ID</Th>
            <Th className="p-4 font-bold text-gray-600">Status</Th>
            <Th className="p-4 font-bold text-gray-600 text-right">Amount</Th>
          </Tr>
        </Thead>
        <Tbody className="divide-y divide-gray-100">
          {bookings && bookings.length > 0 ? (
            bookings.map((b, i) => (
              <Tr key={i} className="hover:bg-gray-50">
                <Td className="p-4 font-mono text-xs text-gray-500">#{b.bookingId || b._id.slice(-6)}</Td>
                <Td className="p-4">
                  <Span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {b.status}
                  </Span>
                </Td>
                <Td className="p-4 text-right font-bold">₹{b.totalAmount?.toLocaleString()}</Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan="5" className="p-8 text-center text-gray-400 font-bold uppercase text-xs">
                No bookings found
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Div>
  </Div>
);

// --- Main Page Component ---

const AdminHotelDetail = () => {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const [verifying, setVerifying] = useState(false);
  const fetchHotelDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getHotelDetails(id);
      if (data.success) {
        setHotel(data.hotel);
        setBookings(data.bookings || []);
        setDocuments(data.documents || null);
      }
    } catch (error) {
      console.error('Error fetching hotel details:', error);
      toast.error('Failed to load hotel information');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchHotelDetails();
  }, [fetchHotelDetails]);
  const handleVerifyDocuments = (action, remark) => {
    if (!hotel) return;
    const isApprove = action === 'approve';
    setModalConfig({
      isOpen: true,
      title: isApprove ? 'Approve Property Documents?' : 'Reject Property Documents?',
      message: isApprove
        ? 'This will mark all submitted documents as verified and move the property to approved status.'
        : 'This will reject the submitted documents and keep the property hidden from users.',
      type: isApprove ? 'success' : 'danger',
      confirmText: isApprove ? 'Approve' : 'Reject',
      onConfirm: async () => {
        try {
          setVerifying(true);
          const res = await adminService.verifyPropertyDocuments(hotel._id, action, remark);
          if (res.success) {
            toast.success(isApprove ? 'Documents approved successfully' : 'Documents rejected successfully');
            setHotel(res.property);
            setDocuments(res.documents);
          }
        } catch {
          toast.error('Failed to update document verification');
        } finally {
          setVerifying(false);
        }
      },
    });
  };
  const handleStatusToggle = async () => {
    const isSuspended = hotel.status === 'suspended';
    const newStatus = isSuspended ? 'approved' : 'suspended';
    setModalConfig({
      isOpen: true,
      title: isSuspended ? 'Activate Hotel?' : 'Suspend Hotel?',
      message: isSuspended
        ? `Hotel "${hotel.propertyName}" will be able to receive bookings again.`
        : `Suspending "${hotel.propertyName}" will prevent it from receiving new bookings.`,
      type: isSuspended ? 'success' : 'danger',
      confirmText: isSuspended ? 'Activate' : 'Suspend',
      onConfirm: async () => {
        try {
          const res = await adminService.updateHotelStatus(hotel._id, newStatus);
          if (res.success) {
            toast.success(`Hotel ${isSuspended ? 'activated' : 'suspended'} successfully`);
            fetchHotelDetails();
          }
        } catch {
          toast.error('Failed to update hotel status');
        }
      },
    });
  };
  if (loading)
    return (
      <ScrollDiv className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <UiIcon as={Loader2} className="animate-spin text-gray-400" size={48} />
        <P className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading property details...</P>
      </ScrollDiv>
    );
  if (!hotel)
    return (
      <ScrollDiv className="text-center py-20">
        <UiIcon as={AlertCircle} size={48} className="mx-auto text-red-400 mb-4" />
        <H2 className="text-2xl font-bold text-gray-900">Property Not Found</H2>
        <Link to="/hotel/admin/properties" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">
          Back to Properties
        </Link>
      </ScrollDiv>
    );
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Building2,
    },
    {
      id: 'gallery',
      label: 'Full Gallery',
      icon: ImageIcon,
    },
    {
      id: 'documents',
      label: 'KYC Documents',
      icon: ShieldCheck,
    },
    {
      id: 'rooms',
      label: 'Rooms & Pricing',
      icon: Bed,
    },
    {
      id: 'rates',
      label: 'Rates & Availability',
      icon: Calendar,
    },
    {
      id: 'bookings',
      label: 'Booking History',
      icon: Calendar,
    },
  ];
  return (
    <ScrollDiv className="space-y-6 max-w-6xl mx-auto pb-10">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      <Div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
        <Link to="/hotel/admin/properties" className="hover:text-black transition-colors">
          Properties
        </Link>
        <Span>/</Span>
        <Span className="text-black font-bold">{hotel.propertyName}</Span>
      </Div>

      <Div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <Div className="flex items-center gap-5">
          <Div className="w-20 h-20 rounded-xl bg-gray-100 shadow-inner flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
            {hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0]) ? (
              <Img
                src={hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0].url) || (hotel.propertyImages && hotel.propertyImages[0])}
                alt="Hotel"
                className="w-full h-full object-cover"
              />
            ) : (
              <UiIcon as={Building2} size={32} className="text-gray-300" />
            )}
          </Div>
          <Div>
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{hotel.propertyName}</H1>
              {hotel.status === 'suspended' ? (
                <Span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-full flex items-center uppercase">
                  <UiIcon as={Ban} size={10} className="mr-1" /> SUSPENDED
                </Span>
              ) : (
                <Span
                  className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full flex items-center uppercase ${hotel.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}
                >
                  {hotel.status === 'approved' ? <UiIcon as={CheckCircle} size={10} className="mr-1" /> : <UiIcon as={Clock} size={10} className="mr-1" />}
                  {hotel.status}
                </Span>
              )}
            </Div>
            <P className="text-gray-500 text-[10px] font-bold uppercase mt-1 flex items-center">
              <UiIcon as={MapPin} size={12} className="mr-1 text-gray-400" /> {hotel.address?.city}, {hotel.address?.state}
              <Span className="mx-2 text-gray-300">|</Span>
              Owner: {hotel.partnerId?.name || 'N/A'}
            </P>
          </Div>
        </Div>

        <Div className="flex gap-3 w-full md:w-auto">
          <Button
            onClick={handleStatusToggle}
            className={`flex-1 md:flex-none px-4 py-2 border rounded-lg text-[10px] font-bold uppercase transition-colors ${hotel.status === 'suspended' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
          >
            {hotel.status === 'suspended' ? 'Activate' : 'Suspend'}
          </Button>
        </Div>
      </Div>

      <HScroll className="border-b border-gray-200" contentClassName="flex">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <UiIcon as={tab.icon} size={16} />
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </Button>
        ))}
      </HScroll>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -10,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          {activeTab === 'overview' && <OverviewTab hotel={hotel} />}
          {activeTab === 'gallery' && <GalleryTab hotel={hotel} />}
          {activeTab === 'documents' && <DocumentsTab hotel={hotel} documents={documents} onVerify={handleVerifyDocuments} verifying={verifying} />}
          {activeTab === 'rooms' && <RoomsTab rooms={hotel.rooms} />}
          {activeTab === 'rates' && <RoomRatesManager propertyId={id} />}
          {activeTab === 'bookings' && <BookingsTab bookings={bookings} propertyType={hotel?.propertyType} />}
        </motion.div>
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default AdminHotelDetail;
