import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings
import React
import SwiftUI

@objc(EarnYourTimeScreenTimeModule)
class EarnYourTimeScreenTimeModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  /// Xin quyền truy cập Screen Time từ người dùng qua Apple AuthorizationCenter
  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 15.0, *) {
      Task {
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          resolve(true)
        } catch {
          reject("AUTH_FAILED", "Không thể xin quyền Screen Time: \(error.localizedDescription)", error)
        }
      }
    } else {
      reject("UNSUPPORTED_OS", "Screen Time API yêu cầu iOS 15.0 trở lên", nil)
    }
  }

  /// Lấy trạng thái cấp quyền hiện tại
  @objc
  func getAuthorizationStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 15.0, *) {
      let status = AuthorizationCenter.shared.authorizationStatus
      switch status {
      case .approved:
        resolve("approved")
      case .denied:
        resolve("denied")
      case .notDetermined:
        resolve("notDetermined")
      @unknown default:
        resolve("notDetermined")
      }
    } else {
      resolve("notDetermined")
    }
  }

  /// Cập nhật danh sách ứng dụng cần giám sát vào ManagedSettings
  @objc
  func updateMonitoredApps(_ appIds: [String],
                           resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Lưu danh sách bundle IDs vào UserDefaults App Group để DeviceActivityExtension đọc
    if let userDefaults = UserDefaults(suiteName: "group.com.earnyourtime.screentime") {
      userDefaults.set(appIds, forKey: "monitoredAppIds")
      userDefaults.synchronize()
    }
    resolve(true)
  }

  /// Lấy thời gian sử dụng hôm nay (phút) cho danh sách ứng dụng được theo dõi
  @objc
  func getDailyUsageMinutes(_ appIds: [String],
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let userDefaults = UserDefaults(suiteName: "group.com.earnyourtime.screentime") {
      let mins = userDefaults.integer(forKey: "dailyMonitoredMinutes")
      resolve(mins)
    } else {
      resolve(0)
    }
  }
}

