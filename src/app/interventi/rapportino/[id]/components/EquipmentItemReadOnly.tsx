'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { InterventionReportDetail } from '../../../../../types/intervention-reports';
import { EquipmentDetail } from '../../../../../types/equipment';
import { Article } from '../../../../../types/article';

interface EquipmentItemReadOnlyProps {
  item: InterventionReportDetail['items'][0];
  equipmentById: Record<number, EquipmentDetail>;
  articleById: Record<string, Article>;
  getCompressorTypeName: (id?: number) => string;
  getRechargeableGasTypeName: (id?: number) => string;
  formatAdditionalServices: (services: string) => string;
  setLightboxUrl: (url: string) => void;
}

export default function EquipmentItemReadOnly({
  item,
  equipmentById,
  articleById,
  getCompressorTypeName,
  getRechargeableGasTypeName,
  formatAdditionalServices,
  setLightboxUrl
}: EquipmentItemReadOnlyProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      {/* Header apparecchiatura */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {(() => {
              const equipmentId = item.equipment_id;
              const eq = equipmentId ? equipmentById[equipmentId] : undefined;
              if (eq) {
                return eq.description || `Apparecchiatura #${equipmentId}`;
              }
              return equipmentId ? `Apparecchiatura #${equipmentId}` : 'Apparecchiatura non specificata';
            })()}
          </h3>
          {item.equipment_id && equipmentById[item.equipment_id] && (
            <div className="text-sm text-gray-600 mt-1">
              {equipmentById[item.equipment_id].brand_label && (
                <span className="mr-2">{equipmentById[item.equipment_id].brand_label}</span>
              )}
              {equipmentById[item.equipment_id].model && (
                <span className="mr-2">{equipmentById[item.equipment_id].model}</span>
              )}
              {equipmentById[item.equipment_id].serial_number && (
                <span className="text-gray-500">S/N: {equipmentById[item.equipment_id].serial_number}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ricambi utilizzati */}
      {item.articles && item.articles.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-3">Pezzi di ricambio usati</h4>
          <div className="bg-white border border-teal-200 rounded-lg p-4">
            <div className="space-y-2">
              {item.articles.map((article, idx) => (
                <div key={idx} className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-lg">
                  <div className="flex-1">
                    {(() => {
                      const ad = articleById[article.article_id];
                      const title = ad?.short_description || article.article_name || 'Articolo';
                      const desc = ad?.description || article.article_description;
                      return (
                        <>
                          <span className="text-gray-900 font-medium">{title}</span>
                          {desc && <div className="text-sm text-gray-600">{desc}</div>}
                          <div className="text-xs text-gray-500">ID: {article.article_id}{ad?.pnc_code ? ` • PNC: ${ad.pnc_code}` : ''}</div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="ml-3 text-sm text-gray-700 whitespace-nowrap">Qt: {article.quantity}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Note per questa apparecchiatura - Evidenza Maggiore */}
      {item.note && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-amber-500 text-white p-1.5 rounded-full">
              <MessageCircle size={16} />
            </div>
            <h4 className="font-bold text-gray-900 text-base">Note intervento per questa apparecchiatura</h4>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded-lg p-4 shadow-sm">
            <p className="text-gray-900 text-base leading-relaxed font-medium">{item.note}</p>
          </div>
        </div>
      )}

      {/* Gestione Gas per questa apparecchiatura */}
      {item.fl_gas && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Gestione gas per questa apparecchiatura</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Tipologia compressore</div>
                <div className="text-gray-900">{getCompressorTypeName(item.gas_compressor_types_id)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Nuova installazione</div>
                <div className="text-gray-900">{item.is_new_installation ? 'Sì' : 'No'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Tipologia gas caricato</div>
                <div className="text-gray-900">{getRechargeableGasTypeName(item.rechargeable_gas_types_id)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Quantità gas caricato</div>
                <div className="text-gray-900">{item.qty_gas_recharged} gr</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Carica max</div>
                <div className="text-gray-900">{item.max_charge} gr</div>
              </div>
              {item.compressor_model && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Modello compressore</div>
                  <div className="text-gray-900">{item.compressor_model}</div>
                </div>
              )}
              {item.compressor_serial_num && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Matricola compressore</div>
                  <div className="text-gray-900">{item.compressor_serial_num}</div>
                </div>
              )}
              {item.compressor_unique_num && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Numero univoco</div>
                  <div className="text-gray-900">{item.compressor_unique_num}</div>
                </div>
              )}
            </div>

            {/* Servizi aggiuntivi */}
            {item.additional_services && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-600 mb-2">Servizi aggiuntivi</div>
                <div className="text-gray-900">{formatAdditionalServices(item.additional_services)}</div>
              </div>
            )}

            {/* Recupero gas (se presente) */}
            {(item.recovered_rech_gas_types_id || item.qty_gas_recovered) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.recovered_rech_gas_types_id && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Tipologia gas recuperato</div>
                    <div className="text-gray-900">{getRechargeableGasTypeName(item.recovered_rech_gas_types_id)}</div>
                  </div>
                )}
                {item.qty_gas_recovered && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Quantità gas recuperato</div>
                    <div className="text-gray-900">{item.qty_gas_recovered} gr</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Immagini per questa apparecchiatura */}
      {item.images && item.images.length > 0 && (
        <div className="mb-1">
          <h4 className="text-md font-medium text-gray-900 mb-3">Immagini per questa apparecchiatura</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {item.images.map((image, imgIndex) => (
                <div key={imgIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={image.file_url}
                    alt={image.file_name}
                    width={200}
                    height={150}
                    className="w-full h-32 object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(image.file_url)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

